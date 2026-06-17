/**
 * Pure token-aware scheduling policy. Given the current bucket capacities, decide
 * how hard to push: pause when a limit is exhausted, throttle to light models when
 * scarce, and (conservatively) burn expiring capacity when abundant + near a
 * reset. Deterministic + side-effect-free — the orchestrator consults it; it
 * never silently overrides a task's pinned model.
 */

import type { BucketState } from './usage';

export interface ScheduleConfig {
  /** Worker ceiling (fleet/JOBS max). */
  maxJobs: number;
  /** Normal worker count when capacity is healthy. */
  baseJobs: number;
  /** Below this remaining-fraction a bucket is "scarce" (default 0.12). */
  lowFraction?: number;
  /** Above this remaining-fraction all buckets are "abundant" (default 0.5). */
  abundantFraction?: number;
  /** A reset within this many seconds is "near" (default 1800). */
  nearResetSeconds?: number;
  /**
   * When false, treat an exhausted bucket as "scarce" (throttle to 1 light-model
   * worker) instead of pausing entirely. Use when local estimates are unreliable
   * — the drain keeps running and auto-recalibration corrects stale counts on
   * the next successful task. Default: true (original behavior).
   */
  pauseOnExhausted?: boolean;
}

export interface ScheduleDecision {
  /** Stop dispatching entirely (a limit is exhausted). */
  paused: boolean;
  /** How many workers to run this cycle. */
  recommendedJobs: number;
  /** Steer to cheap models / skip heavy tasks. */
  preferLight: boolean;
  /** Capacity is plentiful and about to reset — push heavy work now. */
  burnExpiring: boolean;
  reason: string;
}

export function scheduleDecision(buckets: BucketState[], config: ScheduleConfig): ScheduleDecision {
  const low = config.lowFraction ?? 0.12;
  const abundant = config.abundantFraction ?? 0.5;
  const nearReset = config.nearResetSeconds ?? 1800;
  const pauseOnExhausted = config.pauseOnExhausted ?? true;

  if (buckets.some((b) => b.remaining <= 0)) {
    const ex = buckets.find((b) => b.remaining <= 0)!;
    if (pauseOnExhausted) {
      return {
        paused: true,
        recommendedJobs: 0,
        preferLight: true,
        burnExpiring: false,
        reason: `${ex.key} limit exhausted`,
      };
    }
    // pauseOnExhausted=false: treat as scarce so the drain keeps running and
    // auto-recalibration can correct stale local estimates on a successful task.
    return {
      paused: false,
      recommendedJobs: 1,
      preferLight: true,
      burnExpiring: false,
      reason: `${ex.key} estimate exhausted — throttling (auto-recalibrate on success)`,
    };
  }

  const resetIns = buckets.map((b) => b.resetInSeconds).filter((s): s is number => s != null);
  const minResetIn = resetIns.length ? Math.min(...resetIns) : undefined;
  const nearResetNow = minResetIn != null && minResetIn < nearReset;
  const scarce = buckets.some((b) => b.fraction < low);
  const allAbundant = buckets.length > 0 && buckets.every((b) => b.fraction > abundant);

  if (scarce) {
    return {
      paused: false,
      recommendedJobs: 1,
      preferLight: true,
      burnExpiring: false,
      reason: 'low capacity — throttle to 1 worker + light models',
    };
  }
  if (allAbundant && nearResetNow) {
    return {
      paused: false,
      recommendedJobs: config.maxJobs,
      preferLight: false,
      burnExpiring: true,
      reason: 'abundant capacity near a reset — burn expiring tokens',
    };
  }
  return { paused: false, recommendedJobs: config.baseJobs, preferLight: false, burnExpiring: false, reason: 'normal' };
}
