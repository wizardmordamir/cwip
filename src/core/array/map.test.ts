import { describe, expect, it } from 'bun:test';
import { map } from '.';

describe('map', () => {
  it('maps a function over an array', () => {
    expect(map((x: number) => x * 2, [1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('is curried: returns a function when called with one arg', () => {
    const double = map((x: number) => x * 2);
    expect(double([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('maps to a different type', () => {
    expect(map((x: number) => String(x), [1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('returns [] for an empty array', () => {
    expect(map((x: number) => x, [])).toEqual([]);
  });
});
