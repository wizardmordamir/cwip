import { describe, expect, it } from 'bun:test';
import { includesDeep } from '.';

describe('includesDeep', () => {
  it('finds vals not in array', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    expect(includesDeep('', vals, arr)).toEqual([1, 3]);
  });

  it('finds vals in array with key', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(includesDeep(key, vals, arr)).toEqual([1, 3]);
  });

  it('finds vals in array with deep keys', () => {
    const arr = [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(includesDeep(key, vals, arr)).toEqual([1, 3]);
  });

  it('succeeds with key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(includesDeep(key, vals, arr)).toEqual([]);
  });

  it('succeeds with deep key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(includesDeep(key, vals, arr)).toEqual([]);
  });
});
