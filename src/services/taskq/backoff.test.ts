import { describe, expect, test } from 'bun:test';
import { backoffMs, DEFAULT_BACKOFF } from './backoff';

// A fixed rng of 0.5 cancels the symmetric jitter → the exact capped delay.
const noJitter = () => 0.5;

describe('backoffMs', () => {
  test('exponential schedule (default 1m → 5m → cap), no jitter', () => {
    expect(backoffMs(1, {}, noJitter)).toBe(60_000); // 1m
    expect(backoffMs(2, {}, noJitter)).toBe(300_000); // 5m
    // attempt 3 would be 25m, clamped to the 20m cap.
    expect(backoffMs(3, {}, noJitter)).toBe(DEFAULT_BACKOFF.capMs);
    expect(backoffMs(10, {}, noJitter)).toBe(DEFAULT_BACKOFF.capMs); // stays capped
  });

  test('is non-decreasing up to the cap (fixed rng)', () => {
    let prev = -1;
    for (let a = 1; a <= 8; a++) {
      const d = backoffMs(a, {}, noJitter);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  test('jitter spreads symmetrically within ±fraction of the capped delay', () => {
    // attempt 1 base = 60_000, jitter 0.2 → [48_000, 72_000].
    const low = backoffMs(1, {}, () => 0); // (0*2-1) = -1 → -20%
    const high = backoffMs(1, {}, () => 1); // (1*2-1) = +1 → +20%
    expect(low).toBe(48_000);
    expect(high).toBe(72_000);
    expect(backoffMs(1, {}, noJitter)).toBe(60_000);
  });

  test('honors custom base/factor/cap', () => {
    const opts = { baseMs: 1000, factor: 2, capMs: 5000, jitter: 0 };
    expect(backoffMs(1, opts, noJitter)).toBe(1000);
    expect(backoffMs(2, opts, noJitter)).toBe(2000);
    expect(backoffMs(3, opts, noJitter)).toBe(4000);
    expect(backoffMs(4, opts, noJitter)).toBe(5000); // 8000 clamped to 5000
  });

  test('a zero base yields an immediate (0ms) retry — useful for tests', () => {
    expect(backoffMs(1, { baseMs: 0 }, noJitter)).toBe(0);
    expect(backoffMs(5, { baseMs: 0 }, () => 0.9)).toBe(0); // jitter can never push it negative
  });

  test('never returns a negative delay', () => {
    for (let a = 1; a <= 5; a++) {
      expect(backoffMs(a, { jitter: 1 }, () => 0)).toBeGreaterThanOrEqual(0);
    }
  });

  test('attempt < 1 is treated as attempt 1', () => {
    expect(backoffMs(0, {}, noJitter)).toBe(backoffMs(1, {}, noJitter));
  });
});
