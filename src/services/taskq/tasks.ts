/**
 * Task CRUD + priority positioning. Priority is the `ord` column (lower = higher
 * priority = "top"); insert positions compute a fractional `ord` so a task can
 * land at the top, bottom, or between two others without renumbering the rest.
 */

import { withTx } from './tx';
import type { HoldDisposition, NewTask, TaskPatch, TaskqDb, TaskRow, TaskStatus } from './types';
import { AUTO_MODEL, isParkedStatus } from './types';
import { assertValidNewTask } from './validate';

/**
 * The disposition column value for a target `status`: a PARKED status carries a
 * {@link HoldDisposition} (the `requested` one, or the safe `needs_owner` default
 * — a park never strands silently); a non-parked status carries none. The single
 * place the "parked ⇒ has a disposition, un-park ⇒ cleared" invariant is encoded.
 */
export function dispositionFor(status: TaskStatus, requested?: HoldDisposition | null): HoldDisposition | null {
  if (!isParkedStatus(status)) return null;
  return requested ?? 'needs_owner';
}

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

/** Fetch one task row by its (UNIQUE) slug, or null. */
export function getTaskBySlug(db: TaskqDb, slug: string): TaskRow | null {
  return (db.query(`SELECT * FROM tasks WHERE slug = ?`).get(slug) as TaskRow | undefined | null) ?? null;
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

/**
 * The parked tasks whose disposition is `needs_owner` — the "a HUMAN must act"
 * worklist (no automatic resolver: no retry, no follow-up task, no dep). This is
 * the actionable subset of all holds; everything else is awaiting an automation.
 */
export function listNeedsOwner(db: TaskqDb): TaskRow[] {
  return db
    .query(`SELECT * FROM tasks WHERE hold_disposition = 'needs_owner' ORDER BY ord ASC, id ASC`)
    .all() as TaskRow[];
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
    const status = draft.status ?? 'ready';
    // A task created directly in a parked status still gets a disposition (the
    // contract — never a silent strand); a non-parked status carries none.
    const disposition = dispositionFor(status, draft.hold_disposition);
    // No explicit model ⇒ default to the `auto` marker so the task gets auto-tiered
    // (classify-on-eligible) instead of matching every fleet untiered. An empty
    // string means the same "unset" intent. An explicit alias is kept as-is.
    const model = draft.model && draft.model !== '' ? draft.model : AUTO_MODEL;
    const res = db.run(
      `INSERT INTO tasks (ord, status, slug, title, body, repo, model, think, fast, group_key, serial_group, recur_n, recur_interval_ms, is_template, is_saved, max_attempts, noop_ok, parent_id, note, hold_disposition, resolver_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ord,
      status,
      draft.slug ?? null,
      draft.title.trim(),
      draft.body ?? null,
      draft.repo ?? null,
      model,
      draft.think ?? null,
      draft.fast ? 1 : 0,
      draft.group_key ?? null,
      draft.serial_group ?? null,
      draft.recur_n ?? null,
      draft.recur_interval_ms ?? null,
      draft.is_template ? 1 : 0,
      draft.is_saved ? 1 : 0,
      draft.max_attempts ?? null,
      draft.noop_ok ? 1 : 0,
      draft.parent_id ?? null,
      draft.note ?? null,
      disposition,
      disposition ? (draft.resolver_ref ?? null) : null,
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
    if (patch.noop_ok !== undefined) set('noop_ok', patch.noop_ok ? 1 : 0);
    if (patch.parent_id !== undefined) set('parent_id', patch.parent_id ?? null);
    if (patch.note !== undefined) set('note', patch.note ?? null);
    // Disposition: an explicit patch wins; otherwise a status change re-derives it
    // (un-parking clears it, parking without one stamps the safe default) so the
    // "parked ⇒ has a disposition" invariant holds through edits too.
    if (patch.hold_disposition !== undefined) set('hold_disposition', patch.hold_disposition ?? null);
    else if (patch.status !== undefined)
      set('hold_disposition', dispositionFor(patch.status, current.hold_disposition as HoldDisposition | null));
    if (patch.resolver_ref !== undefined) set('resolver_ref', patch.resolver_ref ?? null);
    else if (patch.status !== undefined && !isParkedStatus(patch.status)) set('resolver_ref', null);

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

/**
 * Set a task's status (+ optional note, e.g. why it's on_hold/failed). The
 * hold-disposition is managed automatically as part of the transition:
 *   - to a PARKED status → stamp `disposition` (or the safe `needs_owner` default),
 *     so a manual hold / `taskq status … failed` never strands silently, and
 *   - to a non-parked status → CLEAR the disposition + resolver (the hold is over).
 * `setStatus` is the no-resolver park; use {@link parkTask} when the park has a
 * `resolver_ref` (awaiting_task / awaiting_dependency) — it always clears the
 * resolver so a leftover one can't mislabel a fresh hold.
 */
export function setStatus(
  db: TaskqDb,
  id: number,
  status: TaskStatus,
  note?: string | null,
  disposition?: HoldDisposition | null,
): void {
  const sets = [`status = ?`, `hold_disposition = ?`, `resolver_ref = NULL`];
  const vals: unknown[] = [status, dispositionFor(status, disposition)];
  if (note !== undefined) {
    sets.push(`note = ?`);
    vals.push(note);
  }
  const res = db.run(`UPDATE tasks SET ${sets.join(', ')}, updated_at = ${NOW} WHERE id = ?`, ...vals, id);
  if (res.changes === 0) throw new Error(`task ${id} not found`);
}

/** Options for {@link parkTask} — the resolver + (for awaiting_retry) the retry time. */
export interface ParkOpts {
  /** The human reason (stamped on `note`). Omit to leave the existing note. */
  note?: string | null;
  /** Resolver slug/id for `awaiting_task` / `awaiting_dependency`. */
  resolverRef?: string | null;
  /**
   * For `awaiting_retry`: the epoch-ms the engine will next consider it eligible,
   * written to `recur_next_at` (the universal "not eligible until" gate). The
   * bounded-backoff failure path sets this itself; pass it here when parking a
   * retry by hand.
   */
  retryAt?: number | null;
}

/**
 * Park a task in a hold WITH its full disposition — the canonical "this is held,
 * and here's who/what unblocks it" primitive. Unlike {@link setStatus} it carries
 * a `resolver_ref` (and an optional `retryAt`), so the rich dispositions
 * (`awaiting_task` naming a follow-up, `awaiting_dependency` naming the blocking
 * slug, `awaiting_retry` with its time) are expressible in one atomic write.
 * Throws if `status` isn't a parked status — parking is the whole point.
 */
export function parkTask(
  db: TaskqDb,
  id: number,
  status: TaskStatus,
  disposition: HoldDisposition,
  opts: ParkOpts = {},
): void {
  if (!isParkedStatus(status)) throw new Error(`parkTask: ${status} is not a parked status`);
  const sets = [`status = ?`, `hold_disposition = ?`, `resolver_ref = ?`];
  const vals: unknown[] = [status, disposition, opts.resolverRef ?? null];
  if (opts.note !== undefined) {
    sets.push(`note = ?`);
    vals.push(opts.note);
  }
  if (opts.retryAt !== undefined) {
    sets.push(`recur_next_at = ?`);
    vals.push(opts.retryAt);
  }
  const res = db.run(`UPDATE tasks SET ${sets.join(', ')}, updated_at = ${NOW} WHERE id = ?`, ...vals, id);
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
