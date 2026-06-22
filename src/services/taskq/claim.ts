import { type BackoffOpts, backoffMs } from './backoff';
import { nextRecurAt } from './recurrence';
import { getTask } from './tasks';
import { withTx } from './tx';
import type { ClaimFilters, TaskqDb, TaskRow } from './types';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
/** Default lease TTL: a worker must heartbeat within this or be reaped. */
export const DEFAULT_LEASE_TTL_MS = 15 * 60_000;
/** Default retry ceiling when neither the task nor the caller specifies one. */
export const DEFAULT_MAX_ATTEMPTS = 3;

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
  // Serial group: skip when another member of the same serial_group is claimed.
  clauses.push(
    `(t.serial_group IS NULL OR NOT EXISTS (SELECT 1 FROM tasks s WHERE s.serial_group = t.serial_group AND s.status = 'claimed' AND s.id <> t.id))`,
  );
  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
}

/**
 * The next task to run (id), or null. Templates are never eligible. Priority:
 *   1. One-shot tasks (no recur_n, no recur_interval_ms, not a template)
 *   2. Time-based recurring tasks whose recur_next_at has passed (or never ran)
 *   3. Count-based recurring tasks (legacy recur_n) off cooldown
 * Read-only; the caller claims it. Pass a live `db` inside a txn for a
 * consistent pick+claim.
 *
 * `recur_next_at` is a UNIVERSAL "not eligible until" gate, honored by every
 * branch — so the retry backoff (which parks a failed task back to `ready` with
 * a future `recur_next_at`) holds the task out of the pool until its delay
 * elapses, without any separate eligibility plumbing.
 */
export function nextEligibleId(db: TaskqDb, nowMs: number, filters?: ClaimFilters): number | null {
  const { sql: filterSql, params } = eligibilityClause(filters);
  // Shared gate: a backoff/`recur_next_at` in the future holds the task out.
  const notBefore = `(t.recur_next_at IS NULL OR t.recur_next_at <= ?)`;

  // 1. One-shot: no recurrence, not a template (still subject to a retry backoff).
  const oneShot = db
    .query(
      `SELECT t.id FROM tasks t
        WHERE t.status = 'ready' AND t.recur_n IS NULL AND t.recur_interval_ms IS NULL
          AND t.is_template = 0 AND ${notBefore}${filterSql}
        ORDER BY t.ord ASC, t.id ASC LIMIT 1`,
    )
    .get(nowMs, ...params) as { id: number } | undefined | null;
  if (oneShot) return oneShot.id;

  // 2. Time-based recurring: due when recur_next_at <= now (or has never run).
  const timeBased = db
    .query(
      `SELECT t.id FROM tasks t
        WHERE t.status = 'ready' AND t.recur_interval_ms IS NOT NULL AND t.is_template = 0
          AND ${notBefore}${filterSql}
        ORDER BY t.ord ASC, t.id ASC LIMIT 1`,
    )
    .get(nowMs, ...params) as { id: number } | undefined | null;
  if (timeBased) return timeBased.id;

  // 3. Count-based recurring (legacy): off cooldown, no one-shot work remains.
  const count = completedCount(db);
  const recur = db
    .query(
      `SELECT t.id FROM tasks t
        WHERE t.status = 'ready' AND t.recur_n IS NOT NULL AND t.is_template = 0
          AND (t.recur_last IS NULL OR (? - t.recur_last) >= t.recur_n)
          AND ${notBefore}${filterSql}
        ORDER BY t.ord ASC, t.id ASC LIMIT 1`,
    )
    .get(count, nowMs, ...params) as { id: number } | undefined | null;
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
    const id = nextEligibleId(db, opts.nowMs, opts.filters);
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
 * Complete a claimed task: record a `completions` row and drop the lease.
 *   - interval set: auto-schedule next run (status → ready, recur_next_at bumped).
 *   - is_saved=1, no interval: park in on_hold for manual re-queuing.
 *   - one-shot (default): status → done.
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
    // Success clears the retry counter so a recurring/saved task starts its next
    // cycle with a fresh attempt budget (a failure-then-success run shouldn't
    // count against the next run's retries).
    if (task.recur_interval_ms != null) {
      // Auto-schedule: back to ready at the next interval boundary.
      const nextAt = nextRecurAt(task.recur_interval_ms, nowMs);
      db.run(
        `UPDATE tasks SET status = 'ready', recur_next_at = ?, attempts = 0, updated_at = ${NOW} WHERE id = ?`,
        nextAt,
        taskId,
      );
    } else if (task.is_saved) {
      // Saved without interval: park until the user manually re-queues it.
      db.run(`UPDATE tasks SET status = 'on_hold', attempts = 0, updated_at = ${NOW} WHERE id = ?`, taskId);
    } else {
      db.run(`UPDATE tasks SET status = 'done', attempts = 0, updated_at = ${NOW} WHERE id = ?`, taskId);
    }
  });
}

/** Tunables for bounded auto-retry on failure (defaults applied when omitted). */
export interface FailOpts {
  /**
   * Skip retries and park terminal `failed` immediately. For a non-retryable
   * outcome (the worker determined the task is impossible / needs a human) so we
   * don't burn the whole attempt budget on a known dead-end.
   */
  permanent?: boolean;
  /** Retry ceiling when the task has no per-task `max_attempts`. Default {@link DEFAULT_MAX_ATTEMPTS}. */
  maxAttempts?: number;
  /** Backoff schedule for the re-queue delay (see {@link backoffMs}). */
  backoff?: BackoffOpts;
  /** Injectable RNG for the backoff jitter (deterministic tests). */
  rng?: () => number;
}

/** What a failure did to the task: re-queued for retry, or parked terminal. */
export interface FailOutcome {
  /** The task's status after the failure. */
  status: 'ready' | 'failed';
  /** Attempt count after this failure (incremented). */
  attempts: number;
  /** The effective ceiling used (`max_attempts` ?? config default). */
  maxAttempts: number;
  /** True when attempts are exhausted (or `permanent`) → terminal `failed`. */
  terminal: boolean;
  /** When retried, the epoch-ms the task is next eligible (its backoff `recur_next_at`). */
  retryAt?: number;
}

/**
 * Apply a failure to a task WITHOUT opening a transaction (the caller must
 * already hold one). Bounded retry: increment `attempts`; while it's below the
 * effective ceiling and the failure isn't `permanent`, return the task to
 * `ready` with a backoff (`recur_next_at = now + backoff`) so a transient hiccup
 * gets time to clear before the automatic retry. Once exhausted (or permanent),
 * park terminal `failed`. The lease is always dropped and `note` records the
 * reason. Shared by {@link failTask} and {@link reapExpired} so a lease-reap is
 * accounted exactly like an explicit failure.
 */
function applyFailure(db: TaskqDb, taskId: number, reason: string, nowMs: number, opts: FailOpts): FailOutcome {
  const task = getTask(db, taskId);
  if (!task) throw new Error(`task ${taskId} not found`);
  db.run(`DELETE FROM leases WHERE task_id = ?`, taskId);

  const attempts = task.attempts + 1;
  const maxAttempts = task.max_attempts ?? opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const willRetry = opts.permanent !== true && attempts < maxAttempts;

  if (willRetry) {
    const retryAt = nowMs + backoffMs(attempts, opts.backoff, opts.rng);
    db.run(
      `UPDATE tasks SET status = 'ready', attempts = ?, recur_next_at = ?, note = ?, updated_at = ${NOW} WHERE id = ?`,
      attempts,
      retryAt,
      reason,
      taskId,
    );
    return { status: 'ready', attempts, maxAttempts, terminal: false, retryAt };
  }

  db.run(
    `UPDATE tasks SET status = 'failed', attempts = ?, note = ?, updated_at = ${NOW} WHERE id = ?`,
    attempts,
    reason,
    taskId,
  );
  return { status: 'failed', attempts, maxAttempts, terminal: true };
}

/**
 * Fail a claimed task with a reason. Bounded auto-retry: a transient failure is
 * re-queued (status `ready`) with an exponential backoff until `attempts`
 * reaches the effective ceiling, then it parks terminal `failed`. Pass
 * `{ permanent: true }` (or use {@link failHard}) to skip retries for a
 * known dead-end. Returns the {@link FailOutcome} so the caller can surface
 * "retry N/M in …" vs a terminal failure.
 */
export function failTask(db: TaskqDb, taskId: number, reason: string, nowMs: number, opts: FailOpts = {}): FailOutcome {
  return withTx(db, () => applyFailure(db, taskId, reason, nowMs, opts));
}

/**
 * Permanently fail a task — no retries (e.g. the worker determined it's
 * impossible or needs a human). Convenience over `failTask(…, { permanent: true })`.
 */
export function failHard(db: TaskqDb, taskId: number, reason: string, nowMs: number): FailOutcome {
  return failTask(db, taskId, reason, nowMs, { permanent: true });
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
 * `expires_at <= nowMs` is routed through the SAME retry accounting as an
 * explicit failure — so a reaped task increments `attempts` and is re-queued with
 * a backoff, and a task that repeatedly hangs eventually parks terminal `failed`
 * (after the ceiling) instead of looping forever. Returns the number reaped. This
 * is the "resume" path. `opts` carries the retry ceiling/backoff (defaults apply).
 */
export function reapExpired(db: TaskqDb, nowMs: number, opts: FailOpts = {}): number {
  return withTx(db, () => {
    const expired = db.query(`SELECT task_id FROM leases WHERE expires_at <= ?`).all(nowMs) as { task_id: number }[];
    for (const { task_id } of expired) {
      applyFailure(db, task_id, 'lease expired (worker crashed or stopped heartbeating)', nowMs, opts);
    }
    return expired.length;
  });
}
