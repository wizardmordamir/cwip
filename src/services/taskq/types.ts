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
 * `claimed`; `done` is terminal. `draft` is the owner's pre-queue space. The rest
 * are holds the scheduler skips.
 *   draft          — owner-authored, NOT yet queued; never auto-claimed (like a
 *                    template). The owner's own pre-queue space, kept distinct
 *                    from the parked holds workers fall into; the owner moves it
 *                    → ready to queue it (or duplicates it). Owner-owned, never a
 *                    worker park — so it carries no hold disposition.
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
  'draft',
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

/**
 * Statuses a human/UI may set directly (runtime states are engine-owned).
 * `draft` leads: it's the owner's pre-queue authoring state, and the owner
 * promotes a draft → ready to queue it.
 */
export const AUTHORABLE_STATUSES: TaskStatus[] = ['draft', 'ready', 'on_hold', 'not_ready', 'pending_triage'];

/**
 * The PARKED statuses — a task in one of these is NOT dispatchable and is waiting
 * on something. Every park MUST carry a {@link HoldDisposition} so the owner can
 * tell at a glance whether action is needed (the contract: a park may never
 * silently strand a task). The non-parked statuses (draft, pending_triage, ready,
 * claimed, done) carry no disposition — `draft` is owner-owned (not a hold at
 * all), and the rest clear it on the way out of a hold.
 */
export const PARKED_STATUSES = ['blocked', 'on_hold', 'needs_input', 'not_ready', 'failed'] as const;
export type ParkedStatus = (typeof PARKED_STATUSES)[number];

/** True when `status` is a PARKED status (a hold that needs a disposition). */
export function isParkedStatus(status: TaskStatus): status is ParkedStatus {
  return (PARKED_STATUSES as readonly string[]).includes(status);
}

// ── Hold disposition (who unblocks a parked task + when) ───────────────────────

/**
 * For a PARKED task: WHO unblocks it and WHEN — machine-set, never free-text — so
 * a glance tells the owner whether *they* must act. The motivating bug: a
 * false-done task reverted to a bare `on_hold` with only a prose note, no retry
 * and no heal — silently STUCK while blocking its dependents. So every park path
 * now declares a disposition; if it cannot guarantee an auto-resolution it MUST
 * choose `needs_owner` (a park may never silently strand a task).
 *
 *   needs_owner        — only a human can unblock it (a decision, credential, or
 *                        triage). The safe default: pick it whenever no automatic
 *                        resolution is guaranteed.
 *   awaiting_task      — another task/automation will resolve it; `resolver_ref`
 *                        names that task (slug/id) — e.g. a filed heal follow-up.
 *   awaiting_retry     — the engine will auto-retry; the retry time is the task's
 *                        `recur_next_at` (the bounded-backoff "not eligible until").
 *   awaiting_dependency— an unmet `needs:` dep blocks it; `resolver_ref` carries
 *                        the blocking slug(s). Auto-clears when the dep completes.
 */
export const HOLD_DISPOSITIONS = ['needs_owner', 'awaiting_task', 'awaiting_retry', 'awaiting_dependency'] as const;
export type HoldDisposition = (typeof HOLD_DISPOSITIONS)[number];

/** True when `d` is a valid {@link HoldDisposition}. */
export function isHoldDisposition(d: string): d is HoldDisposition {
  return (HOLD_DISPOSITIONS as readonly string[]).includes(d);
}

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
  /**
   * Failure count for bounded auto-retry. Incremented on each explicit failure
   * AND each lease-reap; once it reaches the effective max the task parks
   * terminal `failed` instead of being re-queued.
   */
  attempts: number;
  /**
   * Per-task retry ceiling; null falls back to the orchestrator's config default.
   * A failed/reaped task is re-queued (with backoff) while `attempts < max`.
   */
  max_attempts: number | null;
  /**
   * 1 = this task may legitimately complete with NO git delta (an audit/check/
   * review, an "only change if needed" task that finds everything OK, or a task
   * that only files follow-up taskq tasks). The false-done gate skips its
   * non-empty-delta requirement for such a task (it still checks for a build
   * regression). 0 = ordinary code-change task — a no-op "done" is a false-done.
   */
  noop_ok: number;
  parent_id: number | null;
  /** Why it's on_hold / blocked / needs_input / failed (the human reason). */
  note: string | null;
  /**
   * For a PARKED task: WHO/WHAT unblocks it (a {@link HoldDisposition}). Set by
   * every park path, cleared on un-park. null ⇒ not parked (or a legacy row not
   * yet backfilled). See {@link HOLD_DISPOSITIONS}.
   */
  hold_disposition: string | null;
  /**
   * The resolver for `awaiting_task`/`awaiting_dependency`: the slug (or id) of
   * the task/automation/dep that will unblock this. null for `needs_owner` (no
   * automatic resolver) and `awaiting_retry` (the resolver is the engine itself,
   * timed by `recur_next_at`).
   */
  resolver_ref: string | null;
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
  /** Per-task retry ceiling (overrides the config default); pass null to clear. */
  max_attempts?: number | null;
  /**
   * When true, the task may legitimately land NO git delta — the false-done gate
   * accepts a no-op completion (it still rejects a build regression). Set this on
   * diagnostic/audit/check/review tasks. Default false: a no-op "done" is a false-done.
   */
  noop_ok?: boolean;
  parent_id?: number;
  note?: string;
  /**
   * When creating a task directly in a PARKED status, WHO/WHAT unblocks it. Omit
   * for a non-parked status; omit on a parked status and the engine stamps the
   * safe default (`needs_owner`) — a created park never strands silently either.
   */
  hold_disposition?: HoldDisposition;
  /** Resolver slug/id for `awaiting_task` / `awaiting_dependency` (see {@link HoldDisposition}). */
  resolver_ref?: string | null;
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
