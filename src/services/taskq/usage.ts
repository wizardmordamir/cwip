/**
 * Token-usage accounting — a rolling-window ledger per limit bucket (the
 * dependable, subscription-API-free telemetry). The orchestrator records each
 * run's model-weighted cost; remaining capacity for a bucket is
 * `limit − Σ(units within its window)`. Manual `/usage` calibration inserts a
 * sized 'manual' event (which ages out of the rolling window on its own) and may
 * set the bucket's limit + reset time. All timestamps are epoch-ms.
 */

import type { TaskqDb } from './types';

/** The three Max-plan windows we track. */
export const USAGE_BUCKETS = ['session_5h', 'weekly_total', 'weekly_sonnet'] as const;
export type UsageBucketKey = (typeof USAGE_BUCKETS)[number];

/**
 * Rough model-weighting of a run's output tokens into "usage units". Opus is the
 * unit; cheaper models cost proportionally less. Approximate — calibration tunes
 * the per-bucket limit to fit reality; these only set the relative shape.
 */
export const MODEL_UNIT_WEIGHT: Record<string, number> = {
  opus: 1,
  'opus-1m': 1.2,
  sonnet: 0.25,
  haiku: 0.05,
  fable: 0.5,
};

export function unitWeight(model: string | null | undefined): number {
  return model ? (MODEL_UNIT_WEIGHT[model] ?? 1) : 1;
}

export interface BucketState {
  key: string;
  limit: number;
  used: number;
  remaining: number;
  /** Fraction remaining (0–1). */
  fraction: number;
  windowSeconds: number;
  /** Seconds until the configured reset, if calibrated (else undefined). */
  resetInSeconds?: number;
}

/** Record a raw usage event against one bucket. */
export function recordUsageEvent(
  db: TaskqDb,
  e: { at: number; bucketKey: string; units: number; model?: string | null; source?: string },
): void {
  db.run(
    `INSERT INTO usage_ledger (at, bucket_key, units, model, source) VALUES (?, ?, ?, ?, ?)`,
    e.at,
    e.bucketKey,
    e.units,
    e.model ?? null,
    e.source ?? 'run',
  );
}

/**
 * Record a completed run's cost: weighted units land in `session_5h` +
 * `weekly_total`, and (for a Sonnet run) also `weekly_sonnet`.
 */
export function recordRun(db: TaskqDb, run: { at: number; model: string | null; outputTokens: number }): void {
  const units = run.outputTokens * unitWeight(run.model);
  recordUsageEvent(db, { at: run.at, bucketKey: 'session_5h', units, model: run.model });
  recordUsageEvent(db, { at: run.at, bucketKey: 'weekly_total', units, model: run.model });
  if (run.model === 'sonnet') recordUsageEvent(db, { at: run.at, bucketKey: 'weekly_sonnet', units, model: run.model });
}

/** Current state of one bucket (limit − windowed usage). */
export function bucketState(db: TaskqDb, key: string, now: number): BucketState | null {
  const b = db.query(`SELECT limit_units, window_seconds, reset_at FROM limit_buckets WHERE key = ?`).get(key) as
    | { limit_units: number; window_seconds: number; reset_at: number | null }
    | undefined
    | null;
  if (!b) return null;
  const since = now - b.window_seconds * 1000;
  const row = db
    .query(`SELECT COALESCE(SUM(units), 0) AS u FROM usage_ledger WHERE bucket_key = ? AND at > ?`)
    .get(key, since) as {
    u: number;
  };
  const used = row.u;
  const remaining = Math.max(0, b.limit_units - used);
  return {
    key,
    limit: b.limit_units,
    used,
    remaining,
    fraction: b.limit_units > 0 ? remaining / b.limit_units : 0,
    windowSeconds: b.window_seconds,
    resetInSeconds: b.reset_at != null ? Math.max(0, Math.round((b.reset_at - now) / 1000)) : undefined,
  };
}

/** State of all tracked buckets. */
export function allBucketStates(db: TaskqDb, now: number): BucketState[] {
  return USAGE_BUCKETS.map((k) => bucketState(db, k, now)).filter((b): b is BucketState => b !== null);
}

/**
 * Calibrate a bucket from a manual `/usage` reading: optionally set the limit +
 * reset time, then replace any prior 'manual' event with one sized to the
 * observed consumed fraction (so remaining matches what you saw).
 */
export function calibrateBucket(
  db: TaskqDb,
  key: string,
  cal: { consumedFraction: number; at: number; limitUnits?: number; resetAt?: number },
): void {
  if (cal.limitUnits != null) {
    db.run(`UPDATE limit_buckets SET limit_units = ? WHERE key = ?`, cal.limitUnits, key);
  }
  db.run(`UPDATE limit_buckets SET reset_at = ?, calibrated_at = ? WHERE key = ?`, cal.resetAt ?? null, cal.at, key);
  const limit = (db.query(`SELECT limit_units FROM limit_buckets WHERE key = ?`).get(key) as { limit_units: number })
    .limit_units;
  db.run(`DELETE FROM usage_ledger WHERE bucket_key = ? AND source = 'manual'`, key);
  recordUsageEvent(db, {
    at: cal.at,
    bucketKey: key,
    units: Math.max(0, Math.min(1, cal.consumedFraction)) * limit,
    source: 'manual',
  });
}
