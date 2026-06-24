import { resolveThresholds } from './thresholds';
import type {
  Finding,
  LogReviewInput,
  LogReviewResult,
  LogReviewThresholds,
  RequestMetricRow,
  RouteStat,
  Severity,
  SystemSampleRow,
} from './types';

/** A 5xx is a server error; that's what an "error spike" counts. */
function isServerError(status: number | null): boolean {
  return status != null && status >= 500;
}

/** The p-th percentile (0..1) of an ascending-sortable list, nearest-rank. */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil(p * sortedAsc.length);
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[idx];
}

function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Roll request rows up per `${method} ${route}`, computing latency + error stats. */
export function computeRouteStats(metrics: RequestMetricRow[]): RouteStat[] {
  const groups = new Map<string, { method: string; route: string; durations: number[]; errors: number }>();
  for (const m of metrics) {
    const route = m.route ?? '(unknown)';
    const method = (m.method ?? 'GET').toUpperCase();
    const key = `${method} ${route}`;
    let g = groups.get(key);
    if (!g) {
      g = { method, route, durations: [], errors: 0 };
      groups.set(key, g);
    }
    if (typeof m.durationMs === 'number' && Number.isFinite(m.durationMs)) g.durations.push(m.durationMs);
    if (isServerError(m.status)) g.errors += 1;
  }

  const stats: RouteStat[] = [];
  for (const g of groups.values()) {
    // count is request count (rows seen), not just timed rows, so error-rate is honest
    // even if a row lacked a duration.
    const count = g.durations.length;
    const sorted = [...g.durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, d) => acc + d, 0);
    stats.push({
      method: g.method,
      route: g.route,
      count,
      errorCount: g.errors,
      errorRate: count > 0 ? round(g.errors / count, 4) : 0,
      avgDurationMs: count > 0 ? round(sum / count, 1) : 0,
      p95DurationMs: round(percentile(sorted, 0.95), 1),
      maxDurationMs: sorted.length ? round(sorted[sorted.length - 1], 1) : 0,
    });
  }
  // Worst (slowest p95) first — a stable, useful order for surfacing.
  stats.sort((a, b) => b.p95DurationMs - a.p95DurationMs);
  return stats;
}

function slowRouteFinding(s: RouteStat, t: LogReviewThresholds, win: { from: number; to: number }): Finding | null {
  if (s.count < t.minRouteSamples) return null;
  if (s.p95DurationMs < t.slowRouteP95WarnMs) return null;
  const severity: Severity = s.p95DurationMs >= t.slowRouteP95CritMs ? 'critical' : 'warning';
  return {
    kind: 'slow_route',
    severity,
    dedupeKey: `slow_route:${s.method}:${s.route}`,
    summary: `Slow route ${s.method} ${s.route}: p95 ${s.p95DurationMs}ms over ${s.count} req`,
    route: s.route,
    method: s.method,
    stats: {
      count: s.count,
      p95DurationMs: s.p95DurationMs,
      avgDurationMs: s.avgDurationMs,
      maxDurationMs: s.maxDurationMs,
    },
    windowFromTs: win.from,
    windowToTs: win.to,
  };
}

function errorSpikeFinding(s: RouteStat, t: LogReviewThresholds, win: { from: number; to: number }): Finding | null {
  if (s.count < t.minRouteSamples) return null;
  if (s.errorCount < t.minErrorCount) return null;
  if (s.errorRate < t.errorRateWarn) return null;
  const severity: Severity = s.errorRate >= t.errorRateCrit ? 'critical' : 'warning';
  return {
    kind: 'error_spike',
    severity,
    dedupeKey: `error_spike:${s.method}:${s.route}`,
    summary: `Error spike ${s.method} ${s.route}: ${(s.errorRate * 100).toFixed(1)}% 5xx (${s.errorCount}/${s.count})`,
    route: s.route,
    method: s.method,
    stats: { count: s.count, errorCount: s.errorCount, errorRatePct: round(s.errorRate * 100, 2) },
    windowFromTs: win.from,
    windowToTs: win.to,
  };
}

/** Host-level anomaly from the peak event-loop lag in the window's samples. */
function hostAnomalyFindings(
  samples: SystemSampleRow[],
  t: LogReviewThresholds,
  win: { from: number; to: number },
): Finding[] {
  if (samples.length === 0) return [];
  let peakLag = 0;
  for (const s of samples) {
    const lag = typeof s.eventLoopLagMs === 'number' ? s.eventLoopLagMs : 0;
    if (lag > peakLag) peakLag = lag;
  }
  if (peakLag < t.eventLoopLagWarnMs) return [];
  const severity: Severity = peakLag >= t.eventLoopLagCritMs ? 'critical' : 'warning';
  return [
    {
      kind: 'host_anomaly',
      severity,
      dedupeKey: 'host_anomaly:event_loop_lag',
      summary: `Event-loop lag peaked at ${round(peakLag, 1)}ms over ${samples.length} sample(s)`,
      stats: { peakEventLoopLagMs: round(peakLag, 1), samples: samples.length },
      windowFromTs: win.from,
      windowToTs: win.to,
    },
  ];
}

/**
 * Review one already-fetched window of request metrics (+ optional host samples)
 * and return the bottleneck / error-spike / host-anomaly findings in it.
 *
 * Pure + windowed by design: the consumer fetches only rows newer than its
 * watermark (the incremental safeguard) and the batch IS the analysis window, so
 * each recurring run naturally analyzes ~one interval of traffic. Min-sample
 * thresholds keep a tiny batch from producing noise.
 */
export function reviewLogs(input: LogReviewInput, overrides?: Partial<LogReviewThresholds>): LogReviewResult {
  const t = resolveThresholds(overrides);
  const win = { from: input.windowFromTs, to: input.windowToTs };
  const routeStats = computeRouteStats(input.metrics);
  const samples = input.samples ?? [];

  const findings: Finding[] = [];
  for (const s of routeStats) {
    const slow = slowRouteFinding(s, t, win);
    if (slow) findings.push(slow);
    const err = errorSpikeFinding(s, t, win);
    if (err) findings.push(err);
  }
  findings.push(...hostAnomalyFindings(samples, t, win));

  return {
    findings,
    routeStats,
    scannedMetrics: input.metrics.length,
    scannedSamples: samples.length,
  };
}
