/**
 * taskq domain model + the structural SQLite handle the engine runs against.
 *
 * Like the sibling `services/sqlite` helpers, the engine never imports
 * `bun:sqlite` — it takes whatever synchronous handle the caller already opened
 * (the `taskq` bin and rubato both pass a `bun:sqlite` `Database`, which
 * satisfies {@link TaskqDb} structurally). That keeps cwip driver-agnostic and
 * lets tests drive the engine with an in-memory database.
 */

/** A prepared statement (positional `?` params bound per call). */
export interface TaskqStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

/** The minimal `bun:sqlite`-shaped surface the engine needs. */
export interface TaskqDb {
  query(sql: string): TaskqStatement;
  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  exec(sql: string): void;
}

// ── Task lifecycle ────────────────────────────────────────────────────────────

/**
 * Every task state. Only `ready` is dispatchable; the orchestrator/reaper own
 * `claimed`; `done` is terminal. The rest are holds the scheduler skips.
 *   pending_triage — blank model/think, awaiting auto-grading (opt-in triage)
 *   ready          — configured + eligible to run
 *   claimed        — lease held, executing
 *   blocked        — an unmet `needs:` dependency (auto-clears)
 *   on_hold        — your manual hold (+ optional note)
 *   needs_input    — gateway/clarification pending (tree paused, others run)
 *   not_ready      — blocked on something external
 *   failed         — AI-blocked mid-run (+ reason note)
 *   done           — complete (history in `completions`)
 */
export const TASK_STATUSES = [
  'pending_triage',
  'ready',
  'claimed',
  'blocked',
  'on_hold',
  'needs_input',
  'not_ready',
  'failed',
  'done',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The only status the orchestrator may claim. */
export const DISPATCHABLE_STATUS: TaskStatus = 'ready';

/** Statuses a human/UI may set directly (runtime states are engine-owned). */
export const AUTHORABLE_STATUSES: TaskStatus[] = ['ready', 'on_hold', 'not_ready', 'pending_triage'];

// ── Model / thinking vocabulary (canonical home; rubato defers to this) ────────

export type ThinkLevel = 'off' | 'low' | 'medium' | 'high' | 'max';
export const THINK_LEVELS: ThinkLevel[] = ['off', 'low', 'medium', 'high', 'max'];

export const MODEL_ALIASES = ['opus', 'opus-1m', 'sonnet', 'haiku', 'fable'] as const;
export type ModelAlias = (typeof MODEL_ALIASES)[number];

/** A slug id / group key: `[A-Za-z0-9._-]`. */
export const TASK_SLUG_PATTERN = /^[A-Za-z0-9._-]+$/;

// ── Rows ───────────────────────────────────────────────────────────────────────

/** A row of the `tasks` table (verbatim columns; `fast` is 0/1). */
export interface TaskRow {
  id: number;
  /** Priority key: lower = higher priority (top). */
  ord: number;
  status: TaskStatus;
  /** The `(id:X)` slug — unique when set, referenceable by `needs:`. */
  slug: string | null;
  title: string;
  body: string | null;
  repo: string | null;
  model: string | null;
  think: string | null;
  fast: number;
  group_key: string | null;
  /**
   * Serial-execution group name. When set, only one task in the group runs at a
   * time — the orchestrator skips any other member while one is `claimed`.
   */
  serial_group: string | null;
  /** `(recur:N)` cadence; null = one-shot. */
  recur_n: number | null;
  /** Completion count at this recurring task's last run. */
  recur_last: number | null;
  /** Time-based recurrence interval in milliseconds; null = count-based or one-shot. */
  recur_interval_ms: number | null;
  /** Epoch-ms when this time-based recurring task is next eligible; null = immediately due. */
  recur_next_at: number | null;
  /** 1 = saved template (never auto-claimed; users enqueue copies manually); 0 = normal. */
  is_template: number;
  /**
   * 1 = saved task: after completion it returns to on_hold (not done) so it can be
   * re-queued manually or auto-scheduled via recur_interval_ms. 0 = one-shot (done on completion).
   */
  is_saved: number;
  parent_id: number | null;
  /** Why it's on_hold / blocked / needs_input / failed. */
  note: string | null;
  triage_state: string | null;
  complexity: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when creating a task. */
export interface NewTask {
  title: string;
  status?: TaskStatus;
  slug?: string;
  body?: string;
  repo?: string;
  model?: string;
  think?: string;
  fast?: boolean;
  group_key?: string;
  /** Serial-execution group: only one member runs at a time. */
  serial_group?: string;
  /** Count-based recurrence cadence; pass null to clear (remove count-based recurrence). */
  recur_n?: number | null;
  /** Time-based recurrence interval in milliseconds. Set this OR recur_n, not both. Pass null to clear. */
  recur_interval_ms?: number | null;
  /** Whether this task is a saved template (never auto-claimed). */
  is_template?: boolean;
  /**
   * When true, the task returns to on_hold after completion instead of done.
   * Pair with recur_interval_ms for automatic scheduling, or leave unset to
   * require manual re-queuing.
   */
  is_saved?: boolean;
  parent_id?: number;
  note?: string;
  /** `(needs:…)` slugs this task waits on. */
  needs?: string[];
}

/** A patch for {@link updateTask} (only present keys are written). */
export type TaskPatch = Partial<Omit<NewTask, 'title'>> & { title?: string };

/** A held lease over a claimed task. Timestamps are epoch-ms for cheap compares. */
export interface LeaseRow {
  task_id: number;
  worker_id: string;
  worktree: string | null;
  claimed_at: number;
  heartbeat_at: number;
  expires_at: number;
}

/** A completed-task history row. */
export interface CompletionRow {
  task_id: number;
  title: string;
  repo: string | null;
  commit: string | null;
  started_at: number | null;
  ended_at: number;
  duration_s: number | null;
  summary: string | null;
}

/** Tier/scope filters the orchestrator passes when picking the next task. */
export interface ClaimFilters {
  /** Restrict to one repo. */
  repo?: string;
  /** Restrict to these model aliases (a fleet tier); untagged tasks always match. */
  models?: string[];
}
