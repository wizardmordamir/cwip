/**
 * Task CRUD + priority positioning. Priority is the `ord` column (lower = higher
 * priority = "top"); insert positions compute a fractional `ord` so a task can
 * land at the top, bottom, or between two others without renumbering the rest.
 */

import { withTx } from './tx';
import type { NewTask, TaskPatch, TaskqDb, TaskRow, TaskStatus } from './types';
import { assertValidNewTask } from './validate';

/** Where a task lands relative to the existing list (by `ord`). */
export type Position =
  | { at: 'top' }
  | { at: 'bottom' }
  | { at: 'before'; anchorId: number }
  | { at: 'after'; anchorId: number };

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

/** Fetch one task row, or null. */
export function getTask(db: TaskqDb, id: number): TaskRow | null {
  return (db.query(`SELECT * FROM tasks WHERE id = ?`).get(id) as TaskRow | undefined | null) ?? null;
}

/** The `needs:` slugs a task waits on. */
export function getNeeds(db: TaskqDb, id: number): string[] {
  return (db.query(`SELECT needs_slug FROM task_deps WHERE task_id = ?`).all(id) as { needs_slug: string }[]).map(
    (r) => r.needs_slug,
  );
}

/** A task's child tasks (epic decomposition), in priority order. */
export function listChildren(db: TaskqDb, parentId: number): TaskRow[] {
  return db.query(`SELECT * FROM tasks WHERE parent_id = ? ORDER BY ord ASC, id ASC`).all(parentId) as TaskRow[];
}

/** List tasks, newest-priority first; optionally filter by status. */
export function listTasks(db: TaskqDb, opts: { status?: TaskStatus } = {}): TaskRow[] {
  if (opts.status) {
    return db.query(`SELECT * FROM tasks WHERE status = ? ORDER BY ord ASC, id ASC`).all(opts.status) as TaskRow[];
  }
  return db.query(`SELECT * FROM tasks ORDER BY ord ASC, id ASC`).all() as TaskRow[];
}

/** Compute the `ord` value for a target position. Throws if an anchor is gone. */
export function ordFor(db: TaskqDb, position: Position): number {
  if (position.at === 'top') {
    const r = db.query(`SELECT MIN(ord) AS m FROM tasks`).get() as { m: number | null };
    return (r.m ?? 0) - 1;
  }
  if (position.at === 'bottom') {
    const r = db.query(`SELECT MAX(ord) AS m FROM tasks`).get() as { m: number | null };
    return (r.m ?? 0) + 1;
  }
  const anchor = getTask(db, position.anchorId);
  if (!anchor) throw new Error(`anchor task ${position.anchorId} not found`);
  if (position.at === 'before') {
    const r = db.query(`SELECT MAX(ord) AS m FROM tasks WHERE ord < ?`).get(anchor.ord) as { m: number | null };
    return r.m == null ? anchor.ord - 1 : (r.m + anchor.ord) / 2;
  }
  const r = db.query(`SELECT MIN(ord) AS m FROM tasks WHERE ord > ?`).get(anchor.ord) as { m: number | null };
  return r.m == null ? anchor.ord + 1 : (anchor.ord + r.m) / 2;
}

/** Reject a slug already used by another task (clearer than the UNIQUE error). */
function assertSlugFree(db: TaskqDb, slug: string, exceptId: number | null): void {
  const row = db.query(`SELECT id FROM tasks WHERE slug = ?`).get(slug) as { id: number } | undefined | null;
  if (row && row.id !== exceptId) throw new Error(`id "${slug}" is already used by another task`);
}

/** Create a task (with its `needs:` deps) at `position` (default top). Returns the new id. */
export function addTask(db: TaskqDb, draft: NewTask, position: Position = { at: 'top' }): number {
  assertValidNewTask(draft);
  return withTx(db, () => {
    if (draft.slug) assertSlugFree(db, draft.slug, null);
    const ord = ordFor(db, position);
    const res = db.run(
      `INSERT INTO tasks (ord, status, slug, title, body, repo, model, think, fast, group_key, serial_group, recur_n, recur_interval_ms, is_template, is_saved, max_attempts, parent_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ord,
      draft.status ?? 'ready',
      draft.slug ?? null,
      draft.title.trim(),
      draft.body ?? null,
      draft.repo ?? null,
      draft.model ?? null,
      draft.think ?? null,
      draft.fast ? 1 : 0,
      draft.group_key ?? null,
      draft.serial_group ?? null,
      draft.recur_n ?? null,
      draft.recur_interval_ms ?? null,
      draft.is_template ? 1 : 0,
      draft.is_saved ? 1 : 0,
      draft.max_attempts ?? null,
      draft.parent_id ?? null,
      draft.note ?? null,
    );
    const id = Number(res.lastInsertRowid);
    for (const slug of dedupe(draft.needs ?? [])) {
      db.run(`INSERT OR IGNORE INTO task_deps (task_id, needs_slug) VALUES (?, ?)`, id, slug);
    }
    return id;
  });
}

/** Patch a task's columns (only present keys); replaces `needs` when provided. */
export function updateTask(db: TaskqDb, id: number, patch: TaskPatch): void {
  // Validate the merged result so partial edits can't produce an invalid row.
  const current = getTask(db, id);
  if (!current) throw new Error(`task ${id} not found`);
  assertValidNewTask({
    title: patch.title ?? current.title,
    status: patch.status ?? current.status,
    slug: patch.slug ?? current.slug ?? undefined,
    group_key: patch.group_key ?? current.group_key ?? undefined,
    model: patch.model ?? current.model ?? undefined,
    think: patch.think ?? current.think ?? undefined,
    recur_n: 'recur_n' in patch ? (patch.recur_n ?? undefined) : (current.recur_n ?? undefined),
    needs: patch.needs,
  });

  withTx(db, () => {
    if (patch.slug) assertSlugFree(db, patch.slug, id);
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      vals.push(val);
    };
    if (patch.title !== undefined) set('title', patch.title.trim());
    if (patch.status !== undefined) set('status', patch.status);
    if (patch.slug !== undefined) set('slug', patch.slug || null);
    if (patch.body !== undefined) set('body', patch.body ?? null);
    if (patch.repo !== undefined) set('repo', patch.repo ?? null);
    if (patch.model !== undefined) set('model', patch.model || null);
    if (patch.think !== undefined) set('think', patch.think || null);
    if (patch.fast !== undefined) set('fast', patch.fast ? 1 : 0);
    if (patch.group_key !== undefined) set('group_key', patch.group_key || null);
    if (patch.serial_group !== undefined) set('serial_group', patch.serial_group || null);
    if (patch.recur_n !== undefined) set('recur_n', patch.recur_n ?? null);
    if (patch.recur_interval_ms !== undefined) set('recur_interval_ms', patch.recur_interval_ms ?? null);
    if (patch.is_template !== undefined) set('is_template', patch.is_template ? 1 : 0);
    if (patch.is_saved !== undefined) set('is_saved', patch.is_saved ? 1 : 0);
    if (patch.max_attempts !== undefined) set('max_attempts', patch.max_attempts ?? null);
    if (patch.parent_id !== undefined) set('parent_id', patch.parent_id ?? null);
    if (patch.note !== undefined) set('note', patch.note ?? null);

    if (sets.length) {
      db.run(`UPDATE tasks SET ${sets.join(', ')}, updated_at = ${NOW} WHERE id = ?`, ...vals, id);
    }
    if (patch.needs !== undefined) {
      db.run(`DELETE FROM task_deps WHERE task_id = ?`, id);
      for (const slug of dedupe(patch.needs)) {
        db.run(`INSERT OR IGNORE INTO task_deps (task_id, needs_slug) VALUES (?, ?)`, id, slug);
      }
    }
  });
}

/** Set a task's status (+ optional note, e.g. why it's on_hold/failed). */
export function setStatus(db: TaskqDb, id: number, status: TaskStatus, note?: string | null): void {
  const res =
    note === undefined
      ? db.run(`UPDATE tasks SET status = ?, updated_at = ${NOW} WHERE id = ?`, status, id)
      : db.run(`UPDATE tasks SET status = ?, note = ?, updated_at = ${NOW} WHERE id = ?`, status, note, id);
  if (res.changes === 0) throw new Error(`task ${id} not found`);
}

/** Re-position a task (recompute its `ord`). */
export function moveTask(db: TaskqDb, id: number, position: Position): void {
  withTx(db, () => {
    if (!getTask(db, id)) throw new Error(`task ${id} not found`);
    const ord = ordFor(db, position);
    db.run(`UPDATE tasks SET ord = ?, updated_at = ${NOW} WHERE id = ?`, ord, id);
  });
}

/** Delete a task (its deps/leases/completions cascade via FK). */
export function deleteTask(db: TaskqDb, id: number): void {
  const res = db.run(`DELETE FROM tasks WHERE id = ?`, id);
  if (res.changes === 0) throw new Error(`task ${id} not found`);
}

/**
 * Set `serial_group` on all listed task ids in one transaction.
 * Pass null to clear the group from all of them.
 */
export function setSerialGroup(db: TaskqDb, ids: number[], serialGroup: string | null): void {
  if (ids.length === 0) return;
  withTx(db, () => {
    for (const id of ids) {
      db.run(`UPDATE tasks SET serial_group = ?, updated_at = ${NOW} WHERE id = ?`, serialGroup, id);
    }
  });
}

/** Distinct serial_group names currently in the tasks table (non-null only). */
export function listSerialGroups(db: TaskqDb): string[] {
  return (
    db
      .query(`SELECT DISTINCT serial_group FROM tasks WHERE serial_group IS NOT NULL ORDER BY serial_group ASC`)
      .all() as {
      serial_group: string;
    }[]
  ).map((r) => r.serial_group);
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}
