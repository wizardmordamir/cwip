/**
 * False-done detection — the PURE decision core (no git/build/db/fs here). The
 * impure evidence-gathering (git delta, integration build) and the DB revert live
 * in the consumer (rubato's orchestrator/`doneCheck`), which feeds gathered
 * {@link DoneEvidence} into {@link decideDone} and applies the {@link DoneVerdict}
 * via {@link revertCompletion}. Hosted in cwip so the guard logic has ONE tested,
 * driver-agnostic home both apps share.
 *
 * THE PROBLEM this guards against: a worker's `claude -p` envelope reports
 * `subtype:"success"` even when the agent landed ZERO code — so the orchestrator
 * would mark the task `done` with nothing behind it (this actually happened:
 * rfc-31 was falsely "done" with no commits and briefly cascaded to release
 * downstream `needs:`-blocked tasks before a later worker caught it by hand). So a
 * reported "success" is no longer trusted on its own — before an integration-flow
 * task is marked `done` it must show EVIDENCE:
 *   1. it landed commit(s) on `refactor/integration` (a non-empty git delta in the
 *      task's run window) — the objective, always-on check for CODE-CHANGE tasks, and
 *   2. it did not REGRESS the integration build beyond a tolerated/known-red set.
 *
 * THE NO-OP EXCEPTION (this module's reason for existing): some tasks correctly
 * make NO changes — a diagnostic/audit/check/review, an "only change if needed"
 * task that finds everything OK, or a task that only FILES follow-up taskq tasks
 * (not git commits). Demanding a non-empty delta from those wrongly flags an honest
 * success as a false-done (e.g. #267 audit-orchestration-hygiene ran, found nothing
 * to fix, landed 0 commits, and was wrongly reverted). The {@link TaskRow.noop_ok}
 * flag opts a task out of the delta requirement: the gate then ACCEPTS a no-op
 * completion (trusting the worker's judgment that nothing needed changing) while
 * STILL checking for a build regression. Ordinary code-change tasks (the default,
 * `noop_ok = 0`) keep the full delta requirement.
 *
 * DISPOSITION, NOT A BARE `needs_input`: when the gate DOES catch a real
 * false-done, it parks the task in a non-dispatchable hold with a {@link
 * FalseDoneDisposition} that names WHY a human/automation should pick it up — never
 * a bare `needs_input`, which means "a clarification question is waiting." A
 * false-done has no question, so routing it to `needs_input` produced a stuck task
 * with no question to answer (a bug). The verdict carries the disposition plus the
 * concrete hold `status` the consumer parks in.
 */

/** Why a reported success was rejected (drives the note + alert). */
export type FalseDoneReason = 'empty-done' | 'regression';

/**
 * How a caught false-done should be routed — the taskq disposition vocabulary.
 * NONE of these is `needs_input`: that status is reserved for a real clarification
 * question, and a false-done has none. The consumer maps a disposition to a
 * concrete hold status (see {@link DoneVerdict.status}).
 *   needs_owner    — the owner must inspect/decide; no automated path forward.
 *   awaiting_retry — re-queue for an automatic retry (a transient miss).
 *   awaiting_task  — blocked on a sibling/heal task that must land first.
 */
export type FalseDoneDisposition = 'needs_owner' | 'awaiting_retry' | 'awaiting_task';

/** The evidence gathered about a reported-success task, fed to {@link decideDone}. */
export interface DoneEvidence {
  /**
   * Is this task's repo on the integration flow (resolved + has a
   * `refactor/integration` branch)? When false the gate accepts unconditionally —
   * we have no objective branch to measure a landing against, and over-blocking a
   * normal task is worse than missing a false-done on a non-flow repo.
   */
  enforced: boolean;
  /**
   * The task's {@link TaskRow.noop_ok} flag: may it legitimately complete with NO
   * git delta? When true the empty-done check is skipped (the regression check
   * still applies). Set on diagnostic/audit/check/review tasks.
   */
  noopOk: boolean;
  /**
   * New commits on `refactor/integration` between claim and completion (the task's
   * run window). `0` ⇒ nothing landed. For a code-change task that's an empty-done;
   * for a {@link noopOk} task it's accepted.
   */
  landedCommits: number;
  /** Did we run the integration `bun run build` to check for a regression? */
  buildChecked: boolean;
  /** Build result when {@link buildChecked}; undefined otherwise. */
  buildGreen?: boolean;
  /**
   * Was the integration build ALREADY red (or its prior state unknown) before this
   * task? Then a red build now is TOLERATED — it isn't this task's regression. Only
   * a build that was known-GREEN and is now red counts as a regression. Conservative
   * by design: we only flag a regression on positive evidence the task broke a green
   * integration, never on a guess (a false revert of real work is the worse error).
   */
  toleratedRed: boolean;
}

/** What the completion gate decides for a reported-success task. */
export type DoneVerdict =
  | { accept: true; note?: string }
  | {
      accept: false;
      reason: FalseDoneReason;
      /** Why a human/automation should pick it up — never a bare `needs_input`. */
      disposition: FalseDoneDisposition;
      /**
       * The concrete non-dispatchable hold the consumer parks the reverted task in
       * (so downstream `needs:` deps stay blocked and the false `done` never sticks).
       * Always `on_hold` today; the richer per-disposition statuses are a follow-up.
       */
      status: 'on_hold';
      /** Human-readable explanation, stamped on the task's `note` + the alert. */
      note: string;
    };

/**
 * Decide whether a reported "success" really landed, from gathered {@link DoneEvidence}.
 * Pure + total — every branch returns a verdict, so it's exhaustively unit-testable.
 *
 *  - not enforced (non-flow repo)         → accept (can't judge).
 *  - code-change task, landed 0 commits   → REJECT empty-done (disposition needs_owner).
 *  - noop_ok task, landed 0 commits       → accept the no-op (still subject to the regression check).
 *  - built red, not tolerated             → REJECT regression (disposition needs_owner).
 *  - landed ≥1 / accepted no-op, build green/tolerated/unchecked → accept.
 */
export function decideDone(e: DoneEvidence): DoneVerdict {
  if (!e.enforced) return { accept: true };

  // Empty-done is a false-done ONLY for ordinary code-change tasks. A noop_ok task
  // (audit/check/review, "only change if needed", or one that only files follow-up
  // tasks) may correctly land nothing — skip the delta requirement and trust the
  // worker's judgment; the regression check below still applies.
  if (!e.noopOk && e.landedCommits <= 0) {
    return {
      accept: false,
      reason: 'empty-done',
      disposition: 'needs_owner',
      status: 'on_hold',
      note:
        'False-done: the worker reported success but landed ZERO commits on refactor/integration ' +
        '(a non-empty git delta is required to mark a code-change task done). Reverted to on_hold for ' +
        'owner review — re-run it, mark a genuine no-op task with noop_ok, or mark it done by hand only ' +
        'if the work genuinely lives elsewhere.',
    };
  }

  if (e.buildChecked && e.buildGreen === false && !e.toleratedRed) {
    return {
      accept: false,
      reason: 'regression',
      disposition: 'needs_owner',
      status: 'on_hold',
      note:
        'False-done: the worker landed code but REGRESSED the integration build — `bun run build` on ' +
        'refactor/integration was green before this task and is red after it. Reverted to on_hold; fix the ' +
        'regression (or file a follow-up heal) before re-landing.',
    };
  }

  return { accept: true };
}
