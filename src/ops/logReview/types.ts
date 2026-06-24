// Types for the framework-agnostic log-review analyzer (`cwip/log-review`).
//
// The analyzer is pure: it takes a window of already-fetched request-metric rows
// (+ optional host samples) and returns structured findings. It never touches a
// DB, a clock, or a logger — the consuming app owns the incremental watermark,
// the fetch, persistence, and any task-filing. That keeps the "what counts as a
// bottleneck / error spike / anomaly, and how do we phrase the follow-up" logic
// in ONE place both apps share.

/**
 * One slim per-request metric row — the shape ca's `request_metrics` table
 * stores (camelCase at the boundary). `ts` (epoch-ms the request finished) is the
 * incremental cursor key the consumer scans forward on.
 */
export interface RequestMetricRow {
  ts: number;
  method: string | null;
  route: string | null;
  status: number | null;
  durationMs: number | null;
  bytesOut?: number | null;
  userId?: string | null;
}

/** One periodic host/process snapshot — ca's `system_samples` row, camelCased. */
export interface SystemSampleRow {
  ts: number;
  eventLoopLagMs?: number | null;
  reqCount?: number | null;
  errCount?: number | null;
  avgDurationMs?: number | null;
  rss?: number | null;
  heapUsed?: number | null;
  heapTotal?: number | null;
  osUsed?: number | null;
  osTotal?: number | null;
}

/** What a finding is about. */
export type FindingKind = 'slow_route' | 'error_spike' | 'host_anomaly';

/** Finding severity, ascending. */
export type Severity = 'info' | 'warning' | 'critical';

/** Ascending severity rank — for thresholding "file a task only at/above X". */
export const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

/** A single detected issue over the analyzed window. */
export interface Finding {
  kind: FindingKind;
  severity: Severity;
  /**
   * Stable identity for this *kind of* issue (e.g. "slow_route:GET:/api/foo").
   * Deliberately excludes the window timestamps so the SAME recurring issue maps
   * to the SAME key across ticks — that's what lets the consumer dedupe + cooldown
   * (one findings row per key, idempotent task slug) instead of re-filing every run.
   */
  dedupeKey: string;
  /** One-line human summary (used as the task title seed + console row). */
  summary: string;
  /** The route this concerns, when route-scoped. */
  route?: string;
  method?: string;
  /** Structured stats backing the finding (counts, p95, error rate, lag, …). */
  stats: Record<string, number>;
  /** The analysis window [fromTs, toTs] (epoch-ms) this was computed over. */
  windowFromTs: number;
  windowToTs: number;
}

/** Per-route rollup computed during a pass — exposed for surfacing/debug. */
export interface RouteStat {
  route: string;
  method: string;
  count: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
}

/** Tunable detection thresholds (the app may override from config). */
export interface LogReviewThresholds {
  /** Min requests for a route in the window before slow/error checks apply (noise floor). */
  minRouteSamples: number;
  /** p95 latency (ms) at/above which a route is a slow-route warning. */
  slowRouteP95WarnMs: number;
  /** p95 latency (ms) at/above which a slow-route finding is critical. */
  slowRouteP95CritMs: number;
  /** 5xx error-rate (0..1) at/above which a route is an error-spike warning. */
  errorRateWarn: number;
  /** 5xx error-rate (0..1) at/above which an error-spike finding is critical. */
  errorRateCrit: number;
  /** Min 5xx count in the window before an error-spike finding fires (noise floor). */
  minErrorCount: number;
  /** Peak event-loop lag (ms) at/above which a host-anomaly warning fires. */
  eventLoopLagWarnMs: number;
  /** Peak event-loop lag (ms) at/above which a host-anomaly is critical. */
  eventLoopLagCritMs: number;
}

/** Input to {@link reviewLogs} — a single already-fetched window. */
export interface LogReviewInput {
  metrics: RequestMetricRow[];
  samples?: SystemSampleRow[];
  /** Window bounds (epoch-ms) the rows were fetched for; stamped onto findings. */
  windowFromTs: number;
  windowToTs: number;
}

/** Output of {@link reviewLogs}. */
export interface LogReviewResult {
  findings: Finding[];
  routeStats: RouteStat[];
  scannedMetrics: number;
  scannedSamples: number;
}
