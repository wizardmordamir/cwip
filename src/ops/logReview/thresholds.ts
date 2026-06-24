import type { LogReviewThresholds } from './types';

/**
 * Default detection thresholds — conservative enough that a healthy app stays
 * quiet, sensitive enough to surface a real regression. An app can override any
 * subset (e.g. from `app_config`) and pass the merged object to {@link reviewLogs}.
 */
export const DEFAULT_THRESHOLDS: LogReviewThresholds = {
  minRouteSamples: 20,
  slowRouteP95WarnMs: 1_000,
  slowRouteP95CritMs: 3_000,
  errorRateWarn: 0.05,
  errorRateCrit: 0.2,
  minErrorCount: 5,
  eventLoopLagWarnMs: 100,
  eventLoopLagCritMs: 500,
};

/** Merge a partial override onto {@link DEFAULT_THRESHOLDS}. */
export function resolveThresholds(overrides?: Partial<LogReviewThresholds>): LogReviewThresholds {
  return overrides ? { ...DEFAULT_THRESHOLDS, ...overrides } : DEFAULT_THRESHOLDS;
}
