/**
 * Pure backoff math for the orchestrator's bounded auto-retry.
 *
 * A transient task failure is re-queued after an exponentially growing,
 * jitter-spread, capped delay (stored in `recur_next_at`, which the claim query
 * honors as an eligibility gate). Exponential growth gives a flaky service time
 * to recover; the cap keeps the wait bounded; jitter de-syncs a fleet of workers
 * that all tripped on the same outage so they don't retry in lockstep. Pure +
 * deterministic (the only nondeterminism is the injectable `rng`), so it's
 * unit-tested directly.
 */

/** Tunable backoff schedule. Omitted fields fall back to {@link DEFAULT_BACKOFF}. */
export interface BackoffOpts {
  /** Delay before the first retry (attempt 1). Default 60_000 (1 minute). */
  baseMs?: number;
  /** Exponential growth per attempt. Default 5 (1m → 5m → 25m…, then capped). */
  factor?: number;
  /** Hard ceiling on the pre-jitter delay. Default 1_200_000 (20 minutes). */
  capMs?: number;
  /** Symmetric jitter fraction in [0,1]: delay is spread by ±(jitter·delay). Default 0.2. */
  jitter?: number;
}

/** The default schedule: 1m → 5m → 20m (capped), ±20% jitter. */
export const DEFAULT_BACKOFF: Required<BackoffOpts> = {
  baseMs: 60_000,
  factor: 5,
  capMs: 20 * 60_000,
  jitter: 0.2,
};

/**
 * Backoff delay (ms) before the Nth retry. `attempt` is the 1-indexed count of
 * failures so far (1 = first failure → first retry). The delay is
 * `base·factor^(attempt-1)`, clamped to `capMs`, then spread by symmetric jitter.
 * `rng` is injectable for deterministic tests (default `Math.random`); a fixed
 * `rng = () => 0.5` yields exactly the un-jittered, capped delay. Never negative.
 */
export function backoffMs(attempt: number, opts: BackoffOpts = {}, rng: () => number = Math.random): number {
  const { baseMs, factor, capMs, jitter } = { ...DEFAULT_BACKOFF, ...opts };
  const n = Math.max(1, Math.floor(attempt));
  const capped = Math.min(baseMs * factor ** (n - 1), capMs);
  // rng() ∈ [0,1) → (rng()*2 - 1) ∈ [-1,1); scaled by `jitter` gives a ±jitter shift.
  const spread = capped * jitter * (rng() * 2 - 1);
  return Math.max(0, Math.round(capped + spread));
}
