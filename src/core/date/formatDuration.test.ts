import { describe, expect, it } from 'bun:test';
import { formatDuration } from '.';

describe('formatDuration', () => {
  it('shows sub-second durations in milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(950)).toBe('950ms');
  });

  it('composes the largest non-zero units', () => {
    expect(formatDuration(1500)).toBe('2s'); // rounds to nearest second
    expect(formatDuration(90_000)).toBe('1m 30s');
    expect(formatDuration(3_661_000)).toBe('1h 1m 1s');
    expect(formatDuration(90_061_000)).toBe('1d 1h 1m 1s');
  });

  it('drops zero units between non-zero ones only when they are zero', () => {
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(3_660_000)).toBe('1h 1m');
    expect(formatDuration(86_400_000)).toBe('1d');
  });

  it('treats negative and non-finite input as zero', () => {
    expect(formatDuration(-5)).toBe('0ms');
    expect(formatDuration(Number.NaN)).toBe('0ms');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0ms');
  });
});
