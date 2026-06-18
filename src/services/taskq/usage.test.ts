import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { scheduleDecision } from './schedule';
import { migrate, SCHEMA_VERSION } from './schema';
import type { TaskqDb } from './types';
import { allBucketStates, type BucketState, bucketState, calibrateBucket, recordRun, recordUsageEvent } from './usage';

const NOW = 2_000_000_000_000;
function fresh(): TaskqDb {
  const d = new Database(':memory:') as unknown as TaskqDb;
  migrate(d);
  return d;
}

describe('usage ledger', () => {
  test('schema has seeded usage buckets', () => {
    const db = fresh();
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    expect(
      allBucketStates(db, NOW)
        .map((b) => b.key)
        .sort(),
    ).toEqual(['session_5h', 'weekly_sonnet', 'weekly_total']);
  });

  test('recordRun debits session + weekly (and sonnet for sonnet runs)', () => {
    const db = fresh();
    recordRun(db, { at: NOW, model: 'opus', outputTokens: 1000 });
    expect(bucketState(db, 'session_5h', NOW)?.used).toBe(1000); // opus weight 1
    expect(bucketState(db, 'weekly_total', NOW)?.used).toBe(1000);
    expect(bucketState(db, 'weekly_sonnet', NOW)?.used).toBe(0);

    recordRun(db, { at: NOW, model: 'sonnet', outputTokens: 1000 });
    expect(bucketState(db, 'weekly_sonnet', NOW)?.used).toBe(250); // sonnet weight 0.25
  });

  test('events outside the rolling window are not counted', () => {
    const db = fresh();
    recordUsageEvent(db, { at: NOW - 6 * 3600 * 1000, bucketKey: 'session_5h', units: 5000 }); // 6h ago > 5h window
    recordUsageEvent(db, { at: NOW - 1000, bucketKey: 'session_5h', units: 100 });
    expect(bucketState(db, 'session_5h', NOW)?.used).toBe(100);
  });

  test('calibrate sets limit + a sized manual event', () => {
    const db = fresh();
    calibrateBucket(db, 'session_5h', { consumedFraction: 0.5, at: NOW, limitUnits: 100, resetAt: NOW + 3600 * 1000 });
    const s = bucketState(db, 'session_5h', NOW);
    expect(s?.limit).toBe(100);
    expect(s?.used).toBe(50);
    expect(s?.remaining).toBe(50);
    expect(s?.resetInSeconds).toBe(3600);
    // Re-calibrating replaces the manual event (doesn't stack).
    calibrateBucket(db, 'session_5h', { consumedFraction: 0.2, at: NOW });
    expect(bucketState(db, 'session_5h', NOW)?.used).toBe(20);
  });

  test('calibrate clears prior run events — manual snapshot is the sole history', () => {
    const db = fresh();
    // Simulate real drainer usage before calibration.
    recordRun(db, { at: NOW - 3600 * 1000, model: 'opus', outputTokens: 500 }); // 1h ago
    recordRun(db, { at: NOW - 1000, model: 'opus', outputTokens: 300 }); // 1s ago
    // User reads the Claude UI: "79% consumed, resets in 1h" → calibrate.
    calibrateBucket(db, 'session_5h', {
      consumedFraction: 0.79,
      at: NOW,
      resetAt: NOW + 3600 * 1000,
    });
    const s = bucketState(db, 'session_5h', NOW);
    // Should reflect the calibrated reading exactly (21% left), not double-count old run events.
    expect(s?.fraction).toBeCloseTo(0.21, 5);
  });

  test('auto-recover after reset_at passes: pre-reset usage excluded, drain unpauses', () => {
    const db = fresh();
    const RESET_AT = NOW + 4 * 3600 * 1000; // resets in 4h

    // Calibrate: 100% consumed, resets in 4h — drain should pause now.
    calibrateBucket(db, 'session_5h', { consumedFraction: 1, at: NOW, limitUnits: 100, resetAt: RESET_AT });
    expect(bucketState(db, 'session_5h', NOW)?.fraction).toBe(0);
    expect(scheduleDecision(allBucketStates(db, NOW), { maxJobs: 2, baseJobs: 2 }).paused).toBe(true);
    // reset_at is still in the future → show countdown
    expect(bucketState(db, 'session_5h', NOW)?.resetInSeconds).toBe(4 * 3600);

    // 4h + 1s later: reset_at has passed — pre-reset usage is excluded automatically.
    const AFTER_RESET = RESET_AT + 1000;
    const s = bucketState(db, 'session_5h', AFTER_RESET);
    expect(s?.used).toBe(0);
    expect(s?.fraction).toBe(1);
    // reset_at is now in the past → no longer shown as a countdown
    expect(s?.resetInSeconds).toBeUndefined();
    expect(scheduleDecision(allBucketStates(db, AFTER_RESET), { maxJobs: 2, baseJobs: 2 }).paused).toBe(false);

    // Usage recorded after the reset counts normally.
    recordRun(db, { at: AFTER_RESET + 1000, model: 'opus', outputTokens: 500 });
    expect(bucketState(db, 'session_5h', AFTER_RESET + 1000)?.used).toBe(500);
  });
});

describe('scheduleDecision', () => {
  const bucket = (over: Partial<BucketState>): BucketState => ({
    key: 'session_5h',
    limit: 100,
    used: 0,
    remaining: 100,
    fraction: 1,
    windowSeconds: 18000,
    ...over,
  });
  const cfg = { maxJobs: 4, baseJobs: 2 };

  test('exhausted → paused (default)', () => {
    expect(scheduleDecision([bucket({ remaining: 0, fraction: 0 })], cfg).paused).toBe(true);
  });
  test('exhausted + pauseOnExhausted:false → throttle (not paused)', () => {
    const d = scheduleDecision([bucket({ remaining: 0, fraction: 0 })], { ...cfg, pauseOnExhausted: false });
    expect(d.paused).toBe(false);
    expect(d.recommendedJobs).toBe(1);
    expect(d.preferLight).toBe(true);
    expect(d.reason).toMatch(/auto-recalibrate/);
  });
  test('scarce → throttle + light', () => {
    const d = scheduleDecision([bucket({ fraction: 0.05, remaining: 5 })], cfg);
    expect(d.recommendedJobs).toBe(1);
    expect(d.preferLight).toBe(true);
  });
  test('abundant + near reset → burn expiring at maxJobs', () => {
    const d = scheduleDecision([bucket({ fraction: 0.9, resetInSeconds: 600 })], cfg);
    expect(d.burnExpiring).toBe(true);
    expect(d.recommendedJobs).toBe(4);
  });
  test('healthy → baseJobs', () => {
    expect(scheduleDecision([bucket({ fraction: 0.4 })], cfg).recommendedJobs).toBe(2);
  });
});
