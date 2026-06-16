// Framework-agnostic health-check types. A "check" produces a rich, structured
// result (status + human detail + remediation) rather than a bare pass/fail, so
// an app can render an operator console AND drive readiness/alerting from the
// same source. No Express/DB/logger coupling lives here — see ./registry to run
// a set of checks and ./checks for composable probe helpers.

/** The worst status a check is *designed* to raise — intent, used for ordering. */
export type HealthSeverity = 'error' | 'warn' | 'info';

/** The live outcome of a single check run. */
export type HealthStatus = 'ok' | 'info' | 'warn' | 'error';

/** The outcome of one named check. */
export interface HealthResult {
  /** Stable id (used for de-duping notifications, grouping). */
  id: string;
  /** Short human title, e.g. "Mail delivery". */
  title: string;
  /** Grouping label, e.g. "Email", "Dependencies". */
  category: string;
  /** The worst status this check can raise (drives ordering/intent). */
  severity: HealthSeverity;
  /** This run's actual outcome. */
  status: HealthStatus;
  /** Human-readable explanation of the current status. */
  detail: string;
  /** Steps to fix it when not ok (empty when ok). */
  remediation: string[];
}

/** A check: yields one HealthResult. Sync or async; may throw/reject — the
 * runner catches it and reports a synthetic error result. */
export type HealthCheck = () => HealthResult | Promise<HealthResult>;

/** Count of results at each status. */
export interface HealthSummary {
  error: number;
  warn: number;
  info: number;
  ok: number;
}

/** The aggregate of one run over a set of checks. */
export interface HealthReport {
  results: HealthResult[];
  summary: HealthSummary;
  /** ISO timestamp of when the run completed. */
  checkedAt: string;
  /** Convenience: true when no check is at `error` status. */
  ok: boolean;
}
