import { describe, expect, it } from 'bun:test';
import { getKey } from '.';

describe('getKey', () => {
  it('gets a root level key in a deep object', () => {
    expect(getKey('f', { a: { b: { c: 1, d: 2 }, e: 3 }, f: 4 })).toEqual(4);
  });

  it('returns undefined for missing key', () => {
    expect(getKey('d', { a: { b: { c: 1 } } })).toBeUndefined();
  });

  it('should be curried', () => {
    const getA = getKey('a');
    expect(getA({ a: 1 })).toEqual(1);
    expect(getA({ b: 1 })).toBeUndefined();
  });

  it('returns undefined for missing key on non-object', () => {
    expect(getKey('a', 1)).toBeUndefined();
  });
});
