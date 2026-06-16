import { describe, expect, it } from 'bun:test';
import { arrToKeys } from './arrToKeys';

describe('arrToKeys', () => {
  it('zips positional array values onto the given keys', () => {
    expect(arrToKeys('a', 'b', 'c')([1, 2, 3])).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('assigns undefined for keys past the end of the array', () => {
    expect(arrToKeys('a', 'b')([1])).toEqual({ a: 1, b: undefined });
  });

  it('ignores array values past the last key', () => {
    expect(arrToKeys('a')([1, 2, 3])).toEqual({ a: 1 });
  });

  it('returns an empty object when no keys are given', () => {
    expect(arrToKeys()([1, 2])).toEqual({});
  });

  it('is reusable as a partially-applied mapper', () => {
    const toPoint = arrToKeys('x', 'y');
    expect(toPoint([10, 20])).toEqual({ x: 10, y: 20 });
    expect(toPoint([0, 0])).toEqual({ x: 0, y: 0 });
  });
});
