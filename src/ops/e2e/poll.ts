import { sleep } from '../../core/utils/sleep';

export interface PollOptions {
  /** Total budget before the last error is rethrown. */
  timeout: number;
  /** Backoff schedule (ms); the last value repeats once exhausted. */
  intervals: number[];
}

/**
 * Retry `fn` until it resolves without throwing, or the timeout budget is spent —
 * then rethrow its last error. The resilient core behind cwip/e2e assertions
 * (count/url/title/attribute) where Playwright's built-in auto-waiting doesn't
 * apply. Mirrors Playwright's `expect.toPass({ intervals })`.
 */
export const poll = async (fn: () => Promise<void> | void, { timeout, intervals }: PollOptions): Promise<void> => {
  const start = Date.now();
  let attempt = 0;
  let lastErr: unknown;
  while (true) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
      const elapsed = Date.now() - start;
      if (elapsed >= timeout) throw lastErr;
      const wait = intervals[Math.min(attempt, intervals.length - 1)] ?? 250;
      attempt += 1;
      await sleep(Math.min(wait, Math.max(0, timeout - elapsed)));
    }
  }
};
