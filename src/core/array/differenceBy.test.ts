import { describe, expect, it } from 'bun:test';
import { differenceBy } from '.';

describe('differenceBy', () => {
  it('finds vals not in array (no key)', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    // Key first: empty string
    expect(differenceBy('', arr, vals)).toEqual([4]);
  });

  it('finds vals not in array with key', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(differenceBy(key, arr, vals)).toEqual([4]);
  });

  it('finds vals not in array with deep keys', () => {
    const arr = [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(differenceBy(key, arr, vals)).toEqual([4]);
  });

  it('supports curried usage', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const vals = [1, 3];

    // Test full currying
    const diffById = differenceBy('id');
    const fromUsers = diffById(arr);

    expect(fromUsers(vals)).toEqual([3]);
  });

  it('succeeds with key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a';
    // Since 'a' doesn't exist on numbers, extracted values will be undefined.
    // Therefore, 1, 3, and 4 are not found in [undefined, undefined, undefined].
    expect(differenceBy(key, arr, vals)).toEqual([1, 3, 4]);
  });

  it('succeeds with deep key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(differenceBy(key, arr, vals)).toEqual([1, 3, 4]);
  });
});
