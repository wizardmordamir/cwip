import { describe, expect, it } from 'bun:test';
import { computeRouteStats, reviewLogs } from './analyze';
import { DEFAULT_THRESHOLDS } from './thresholds';
import type { RequestMetricRow, SystemSampleRow } from './types';

const WIN = { windowFromTs: 1_000, windowToTs: 2_000 };

/** N rows for one route at a fixed duration + status. */
function rows(n: number, opts: Partial<RequestMetricRow> = {}): RequestMetricRow[] {
  return Array.from({ length: n }, (_, i) => ({
    ts: 1_000 + i,
    method: opts.method ?? 'GET',
    route: opts.route ?? '/api/x',
    status: opts.status ?? 200,
    durationMs: opts.durationMs ?? 10,
    ...opts,
  }));
}

describe('computeRouteStats', () => {
  it('rolls latency + errors up per method+route', () => {
    const stats = computeRouteStats([
      ...rows(3, { route: '/api/a', durationMs: 100 }),
      ...rows(1, { route: '/api/a', durationMs: 100, status: 500 }),
      ...rows(2, { route: '/api/b', durationMs: 5 }),
    ]);
    const a = stats.find((s) => s.route === '/api/a')!;
    expect(a.count).toBe(4);
    expect(a.errorCount).toBe(1);
    expect(a.errorRate).toBeCloseTo(0.25, 5);
    expect(a.avgDurationMs).toBe(100);
    expect(a.maxDurationMs).toBe(100);
    // separate route is its own group
    expect(stats.find((s) => s.route === '/api/b')!.count).toBe(2);
  });

  it('computes a nearest-rank p95', () => {
    // durations 1..100; p95 nearest-rank = the 95th value = 95
    const metrics = Array.from({ length: 100 }, (_, i) => ({
      ts: i,
      method: 'GET',
      route: '/api/x',
      status: 200,
      durationMs: i + 1,
    }));
    expect(computeRouteStats(metrics)[0].p95DurationMs).toBe(95);
  });

  it('sorts worst-p95 first', () => {
    const stats = computeRouteStats([
      ...rows(30, { route: '/api/fast', durationMs: 5 }),
      ...rows(30, { route: '/api/slow', durationMs: 5_000 }),
    ]);
    expect(stats[0].route).toBe('/api/slow');
  });
});

describe('reviewLogs — slow routes', () => {
  it('flags a route whose p95 crosses the warn threshold', () => {
    const result = reviewLogs({ ...WIN, metrics: rows(30, { durationMs: 1_500 }) });
    const f = result.findings.find((x) => x.kind === 'slow_route');
    expect(f).toBeTruthy();
    expect(f!.severity).toBe('warning');
    expect(f!.dedupeKey).toBe('slow_route:GET:/api/x');
    expect(f!.windowFromTs).toBe(WIN.windowFromTs);
  });

  it('escalates to critical past the crit threshold', () => {
    const result = reviewLogs({ ...WIN, metrics: rows(30, { durationMs: 4_000 }) });
    expect(result.findings.find((x) => x.kind === 'slow_route')!.severity).toBe('critical');
  });

  it('stays quiet below the min-sample floor (no noise from tiny batches)', () => {
    const result = reviewLogs({ ...WIN, metrics: rows(5, { durationMs: 9_000 }) });
    expect(result.findings.filter((x) => x.kind === 'slow_route')).toHaveLength(0);
  });

  it('stays quiet for a fast route', () => {
    const result = reviewLogs({ ...WIN, metrics: rows(50, { durationMs: 20 }) });
    expect(result.findings).toHaveLength(0);
  });
});

describe('reviewLogs — error spikes', () => {
  it('flags a route over the error-rate + count floors', () => {
    const metrics = [...rows(40, { durationMs: 10, status: 200 }), ...rows(10, { durationMs: 10, status: 500 })];
    const f = reviewLogs({ ...WIN, metrics }).findings.find((x) => x.kind === 'error_spike');
    expect(f).toBeTruthy();
    expect(f!.dedupeKey).toBe('error_spike:GET:/api/x');
    expect(f!.stats.errorCount).toBe(10);
  });

  it('escalates to critical past the crit error-rate', () => {
    const metrics = [...rows(10, { durationMs: 10, status: 200 }), ...rows(15, { durationMs: 10, status: 500 })];
    expect(reviewLogs({ ...WIN, metrics }).findings.find((x) => x.kind === 'error_spike')!.severity).toBe('critical');
  });

  it('does not fire on a couple of stray 5xx below the count floor', () => {
    const metrics = [...rows(40, { durationMs: 10, status: 200 }), ...rows(2, { durationMs: 10, status: 500 })];
    expect(reviewLogs({ ...WIN, metrics }).findings.filter((x) => x.kind === 'error_spike')).toHaveLength(0);
  });
});

describe('reviewLogs — host anomaly', () => {
  it('flags peak event-loop lag over the threshold', () => {
    const samples: SystemSampleRow[] = [
      { ts: 1_000, eventLoopLagMs: 20 },
      { ts: 1_500, eventLoopLagMs: 250 },
    ];
    const f = reviewLogs({ ...WIN, metrics: [], samples }).findings.find((x) => x.kind === 'host_anomaly');
    expect(f).toBeTruthy();
    expect(f!.severity).toBe('warning');
    expect(f!.stats.peakEventLoopLagMs).toBe(250);
  });

  it('escalates to critical past the crit lag', () => {
    const samples: SystemSampleRow[] = [{ ts: 1_000, eventLoopLagMs: 900 }];
    expect(reviewLogs({ ...WIN, metrics: [], samples }).findings[0].severity).toBe('critical');
  });

  it('stays quiet for a healthy event loop', () => {
    const samples: SystemSampleRow[] = [{ ts: 1_000, eventLoopLagMs: 5 }];
    expect(reviewLogs({ ...WIN, metrics: [], samples }).findings).toHaveLength(0);
  });
});

describe('reviewLogs — dedupe keys are time-stable', () => {
  it('produces the same key across two different windows for the same issue', () => {
    const a = reviewLogs({ windowFromTs: 0, windowToTs: 1, metrics: rows(30, { durationMs: 5_000 }) });
    const b = reviewLogs({ windowFromTs: 9, windowToTs: 9, metrics: rows(30, { durationMs: 5_000 }) });
    expect(a.findings[0].dedupeKey).toBe(b.findings[0].dedupeKey);
  });

  it('reports how many rows it scanned', () => {
    const result = reviewLogs({ ...WIN, metrics: rows(7), samples: [{ ts: 1, eventLoopLagMs: 1 }] });
    expect(result.scannedMetrics).toBe(7);
    expect(result.scannedSamples).toBe(1);
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  it('is sane (warn below crit)', () => {
    expect(DEFAULT_THRESHOLDS.slowRouteP95WarnMs).toBeLessThan(DEFAULT_THRESHOLDS.slowRouteP95CritMs);
    expect(DEFAULT_THRESHOLDS.errorRateWarn).toBeLessThan(DEFAULT_THRESHOLDS.errorRateCrit);
    expect(DEFAULT_THRESHOLDS.eventLoopLagWarnMs).toBeLessThan(DEFAULT_THRESHOLDS.eventLoopLagCritMs);
  });
});
