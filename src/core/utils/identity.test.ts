import { describe, expect, it } from 'bun:test';
import { identity } from './identity';

describe('identity', () => {
  it('returns its argument unchanged', () => {
    expect(identity(1)).toBe(1);
    expect(identity('a')).toBe('a');
    expect(identity(null)).toBe(null);
    expect(identity(undefined)).toBe(undefined);
  });

  it('returns the same reference for objects and arrays', () => {
    const obj = { a: 1 };
    const arr = [1, 2, 3];
    expect(identity(obj)).toBe(obj);
    expect(identity(arr)).toBe(arr);
  });
});
