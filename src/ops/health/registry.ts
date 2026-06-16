// Run a set of health checks and aggregate them. This is the piece a hardcoded
// health route lacks: checks are *injected* (an app registers its own),
// one bad check can't break the run, and the result is a structured report you
// can serve to a console, alert on, or gate readiness with.

import type { HealthCheck, HealthReport, HealthResult, HealthSummary } from './types';

/** Minimal logger surface — accept one, never import one (so health stays
 * dependency-free and works with any logger, incl. cwip's). */
export interface HealthLogger {
  error: (..._args: any[]) => void;
}

export interface RunHealthOptions {
  /** If provided, a check that throws is logged here (in addition to being
   * surfaced as an error result). */
  log?: HealthLogger;
  /** ISO timestamp to stamp the report with (defaults to the current time). */
  now?: string;
}

const checkFailed = (err: unknown): HealthResult => ({
  id: 'check_failed',
  title: 'Health check error',
  category: 'Internal',
  severity: 'error',
  status: 'error',
  detail: `A health check threw: ${err instanceof Error ? err.message : String(err)}`,
  remediation: ['This is a bug in the health check itself — check the server logs.'],
});

/** Tally results by status. */
export const summarizeHealth = (results: HealthResult[]): HealthSummary =>
  results.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { error: 0, warn: 0, info: 0, ok: 0 } as HealthSummary,
  );

/** Run every check (in parallel), catching individual failures, and return the
 * aggregated report. Order of `results` matches the order of `checks`. */
export const runHealthChecks = async (checks: HealthCheck[], options: RunHealthOptions = {}): Promise<HealthReport> => {
  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        return await check();
      } catch (err) {
        options.log?.error('[health] a check threw:', err);
        return checkFailed(err);
      }
    }),
  );
  const summary = summarizeHealth(results);
  return {
    results,
    summary,
    checkedAt: options.now ?? new Date().toISOString(),
    ok: summary.error === 0,
  };
};

/** A mutable registry apps hook their checks into — the "register what you need"
 * surface. Methods chain so registration reads as a fluent list. */
export interface HealthRegistry {
  /** Add one or more checks. */
  register: (..._checks: HealthCheck[]) => HealthRegistry;
  /** A snapshot of the currently-registered checks. */
  list: () => HealthCheck[];
  /** Run all registered checks and aggregate. */
  run: (_options?: RunHealthOptions) => Promise<HealthReport>;
  /** Remove every registered check (mainly for tests). */
  clear: () => void;
}

/** Create a health registry, optionally seeded with a starting set of checks. */
export const createHealthRegistry = (initial: HealthCheck[] = []): HealthRegistry => {
  const checks: HealthCheck[] = [...initial];
  const registry: HealthRegistry = {
    register: (...c) => {
      checks.push(...c);
      return registry;
    },
    list: () => [...checks],
    run: (options) => runHealthChecks(checks, options),
    clear: () => {
      checks.length = 0;
    },
  };
  return registry;
};
