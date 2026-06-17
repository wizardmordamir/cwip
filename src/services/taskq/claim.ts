import { getTask } from './tasks';
import { withTx } from './tx';
import type { ClaimFilters, TaskqDb, TaskRow } from './types';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
/** Default lease TTL: a worker must heartbeat within this or be reaped. */
export const DEFAULT_LEASE_TTL_MS = 15 * 60_000;

export interface ClaimOpts {
  workerId: string;
  worktree?: string | null;
  ttlMs?: number;
  nowMs: number;
  filters?: ClaimFilters;
}

/** Count of completed tasks (drives recurring-task cooldown). */
export function completedCount(db: TaskqDb): number {
  return (db.query(`SELECT COUNT(*) AS c FROM completions`).get() as { c: number }).c;
}

/** Build the shared eligibility WHERE fragment + params for the tier/deps filter. */
function eligibilityClause(filters: ClaimFilters | undefined): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.repo) {
    clauses.push(`t.repo = ?`);
    params.push(filters.repo);
  }
  if (filters?.models?.length) {
    // Untagged tasks (model IS NULL) match any tier; tagged tasks must be in the tier.
    clauses.push(`(t.model IS NULL OR t.model IN (${filters.models.map(() => '?').join(',')}))`);
    params.push(...filters.models);
  }
  // Deps satisfied: no needs_slug points at a non-done task.
  clauses.push(
    `NOT EXISTS (SELECT 1 FROM task_deps d JOIN tasks x ON x.slug = d.needs_slug AND x.status <> 'done' WHERE d.task_id = t.id)`,
  );
  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
}

/**
 * The next task to run (id), or null. One-shots first (top `ord`), then recurring
 * tasks past cooldown. Read-only; the caller claims it. Pass a live `db` inside a
 * txn for a consistent pick+claim.
 */
export function nextEligibleId(db: TaskqDb, filters?: ClaimFilters): number | null {
  const { sql: filterSql, params } = eligibilityClause(filters);

  const oneShot = db
    .query(
      `SELECT t.id FROM tasks t
        WHERE t.status = 'ready' AND t.recur_n IS NULL${filterSql}
        ORDER BY t.ord ASC, t.id ASC LIMIT 1`,
    )
    .get(...params) as { id: number } | undefined | null;
  if (oneShot) return oneShot.id;

  // No one-shot ready → consider recurring tasks that are off cooldown.
  const count = completedCount(db);
  const recur = db
    .query(
      `SELECT t.id FROM tasks t
        WHERE t.status = 'ready' AND t.recur_n IS NOT NULL
          AND (t.recur_last IS NULL OR (? - t.recur_last) >= t.recur_n)${filterSql}
        ORDER BY t.ord ASC, t.id ASC LIMIT 1`,
    )
    .get(count, ...params) as { id: number } | undefined | null;
  return recur ? recur.id : null;
}

function insertLease(db: TaskqDb, taskId: number, opts: ClaimOpts): void {
  const ttl = opts.ttlMs ?? DEFAULT_LEASE_TTL_MS;
  db.run(
    `INSERT INTO leases (task_id, worker_id, worktree, claimed_at, heartbeat_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    taskId,
    opts.workerId,
    opts.worktree ?? null,
    opts.nowMs,
    opts.nowMs,
    opts.nowMs + ttl,
  );
}

/**
 * Atomically claim task `id` if still `ready` (CAS). Returns true on success.
 * Also claims any other `ready` member of the same `(group:G)` for this worker.
 */
export function claim(db: TaskqDb, id: number, opts: ClaimOpts): boolean {
  return withTx(db, () => {
    const res = db.run(
      `UPDATE tasks SET status = 'claimed', updated_at = ${NOW} WHERE id = ? AND status = 'ready'`,
      id,
    );
    if (res.changes === 0) return false; // lost the race / no longer ready
    insertLease(db, id, opts);

    const task = getTask(db, id);
    if (task?.group_key) {
      const members = db
        .query(`SELECT id FROM tasks WHERE group_key = ? AND status = 'ready' AND id <> ?`)
        .all(task.group_key, id) as { id: number }[];
      for (const m of members) {
        db.run(`UPDATE tasks SET status = 'claimed', updated_at = ${NOW} WHERE id = ?`, m.id);
        insertLease(db, m.id, opts);
      }
    }
    return true;
  });
}

/** Pick + claim the next eligible task in one atomic step. Returns it, or null. */
export function claimNext(db: TaskqDb, opts: ClaimOpts): TaskRow | null {
  return withTx(db, () => {
    const id = nextEligibleId(db, opts.filters);
    if (id == null) return null;
    const res = db.run(
      `UPDATE tasks SET status = 'claimed', updated_at = ${NOW} WHERE id = ? AND status = 'ready'`,
      id,
    );
    if (res.changes === 0) return null;
    insertLease(db, id, opts);
    const task = getTask(db, id);
    if (task?.group_key) {
      const members = db
        .query(`SELECT id FROM tasks WHERE group_key = ? AND status = 'ready' AND id <> ?`)
        .all(task.group_key, id) as { id: number }[];
      for (const m of members) {
        db.run(`UPDATE tasks SET status = 'claimed', updated_at = ${NOW} WHERE id = ?`, m.id);
        insertLease(db, m.id, opts);
      }
    }
    return task;
  });
}

/** Extend a lease (worker still alive). Returns false if the lease is gone. */
export function heartbeat(db: TaskqDb, taskId: number, nowMs: number, ttlMs = DEFAULT_LEASE_TTL_MS): boolean {
  const res = db.run(
    `UPDATE leases SET heartbeat_at = ?, expires_at = ? WHERE task_id = ?`,
    nowMs,
    nowMs + ttlMs,
    taskId,
  );
  return res.changes > 0;
}

export interface CompleteInfo {
  commit?: string;
  summary?: string;
  startedAt?: number;
  durationS?: number;
}

/**
 * Complete a claimed task: record a `completions` row and drop the lease. A
 * one-shot becomes `done`; a recurring task returns to `ready` with its
 * `recur_last` bumped to the new completion count (restarting its cooldown).
 */
export function completeTask(db: TaskqDb, taskId: number, info: CompleteInfo, nowMs: number): void {
  withTx(db, () => {
    const task = getTask(db, taskId);
    if (!task) throw new Error(`task ${taskId} not found`);
    db.run(
      `INSERT INTO completions (task_id, title, repo, "commit", started_at, ended_at, duration_s, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      taskId,
      task.title,
      task.repo,
      info.commit ?? null,
      info.startedAt ?? null,
      nowMs,
      info.durationS ?? null,
      info.summary ?? null,
    );
    db.run(`DELETE FROM leases WHERE task_id = ?`, taskId);
    if (task.recur_n != null) {
      const count = completedCount(db); // includes the row just inserted
      db.run(`UPDATE tasks SET status = 'ready', recur_last = ?, updated_at = ${NOW} WHERE id = ?`, count, taskId);
    } else {
      db.run(`UPDATE tasks SET status = 'done', updated_at = ${NOW} WHERE id = ?`, taskId);
    }
  });
}

/** Mark a claimed task failed (AI-blocked) with a reason; drop its lease. */
export function failTask(db: TaskqDb, taskId: number, reason: string, _nowMs: number): void {
  withTx(db, () => {
    db.run(`DELETE FROM leases WHERE task_id = ?`, taskId);
    const res = db.run(
      `UPDATE tasks SET status = 'failed', note = ?, updated_at = ${NOW} WHERE id = ?`,
      reason,
      taskId,
    );
    if (res.changes === 0) throw new Error(`task ${taskId} not found`);
  });
}

/** Un-claim a task (e.g. its run never started): back to `ready`, lease dropped. */
export function releaseLease(db: TaskqDb, taskId: number): void {
  withTx(db, () => {
    db.run(`DELETE FROM leases WHERE task_id = ?`, taskId);
    db.run(`UPDATE tasks SET status = 'ready', updated_at = ${NOW} WHERE id = ? AND status = 'claimed'`, taskId);
  });
}

/**
 * Reclaim stranded leases (holder crashed / failed to heartbeat): any lease with
 * `expires_at <= nowMs` is dropped and its task returned to `ready`. Returns the
 * number reaped. This is the "resume" path.
 */
export function reapExpired(db: TaskqDb, nowMs: number): number {
  return withTx(db, () => {
    const expired = db.query(`SELECT task_id FROM leases WHERE expires_at <= ?`).all(nowMs) as { task_id: number }[];
    for (const { task_id } of expired) {
      db.run(`DELETE FROM leases WHERE task_id = ?`, task_id);
      db.run(`UPDATE tasks SET status = 'ready', updated_at = ${NOW} WHERE id = ? AND status = 'claimed'`, task_id);
    }
    return expired.length;
  });
}
