import { describe, expect, it } from 'bun:test';
import { median, quantile } from './quantile';

describe('quantile', () => {
  it('returns 0 for empty input', () => {
    expect(quantile([], 0.5)).toBe(0);
  });

  it('returns the sole value for a single-element array', () => {
    expect(quantile([42], 0)).toBe(42);
    expect(quantile([42], 0.5)).toBe(42);
    expect(quantile([42], 1)).toBe(42);
  });

  it('q=0 is the min, q=1 is the max', () => {
    const s = [1, 2, 3, 4, 5];
    expect(quantile(s, 0)).toBe(1);
    expect(quantile(s, 1)).toBe(5);
  });

  it('q=0.5 is the median (odd + even length)', () => {
    expect(quantile([1, 2, 3], 0.5)).toBe(2);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it('linearly interpolates between samples (type-7)', () => {
    // pos = 0.95 * (5-1) = 3.8 → lo=3 (40), hi=4 (50), frac 0.8 → 48
    expect(quantile([10, 20, 30, 40, 50], 0.95)).toBeCloseTo(48, 6);
    // pos = 0.25 * 4 = 1.0 → exact index 1 = 20
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
  });

  it('clamps q outside [0,1]', () => {
    const s = [1, 2, 3];
    expect(quantile(s, -1)).toBe(1);
    expect(quantile(s, 2)).toBe(3);
  });
});

describe('median', () => {
  it('returns 0 for empty input', () => {
    expect(median([])).toBe(0);
  });

  it('does not require sorted input and does not mutate it', () => {
    const input = [5, 1, 3, 2, 4];
    expect(median(input)).toBe(3);
    expect(input).toEqual([5, 1, 3, 2, 4]);
  });

  it('averages the two middle values for even length', () => {
    expect(median([4, 2, 1, 3])).toBe(2.5);
  });
});
