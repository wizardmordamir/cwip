import { describe, expect, it } from 'bun:test';
import { chunk, partitionInto } from '.';

describe('chunk', () => {
  it('splits into groups of the given size', () => {
    expect(chunk(2)([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk(3)([1, 2, 3, 4, 5, 6])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('handles a size larger than the array', () => {
    expect(chunk(10)([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it('returns [] for empty input, invalid size, or non-arrays', () => {
    expect(chunk(2)([])).toEqual([]);
    expect(chunk(0)([1, 2, 3])).toEqual([]);
    expect(chunk(-1)([1, 2, 3])).toEqual([]);
    expect(chunk(2)(null as any)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    chunk(2)(input);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('partitionInto', () => {
  it('splits into at most `count` near-equal buckets', () => {
    expect(partitionInto(3)([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
    expect(partitionInto(2)([1, 2, 3, 4])).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('returns fewer buckets than `count` when items are scarce (no empty buckets)', () => {
    const buckets = partitionInto(5)([1, 2]);
    expect(buckets).toEqual([[1], [2]]);
    expect(buckets.length).toBe(2);
  });

  it('preserves every element exactly once', () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    const buckets = partitionInto(4)(items);
    expect(buckets.length).toBeLessThanOrEqual(4);
    expect(buckets.flat()).toEqual(items);
  });

  it('returns [] for empty input or invalid count', () => {
    expect(partitionInto(3)([])).toEqual([]);
    expect(partitionInto(0)([1, 2, 3])).toEqual([]);
    expect(partitionInto(3)(null as any)).toEqual([]);
  });
});
