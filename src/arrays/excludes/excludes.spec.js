import { excludes } from '.';

describe('excludes', () => {
  it('finds vals not in array', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    expect(excludes(arr, vals)).toEqual([4]);
  });

  it('finds vals not in array with key', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(excludes(arr, vals, key)).toEqual([4]);
  });

  it('finds vals not in array with deep keys', () => {
    const arr = [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(excludes(arr, vals, key)).toEqual([4]);
  });

  it('finds vals not in array with deep keys and separator', () => {
    const arr = [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }];
    const vals = [1, 3, 4];
    const key = 'a/b';
    const separator = '/';
    expect(excludes(arr, vals, key, separator)).toEqual([4]);
  });

  it('succeeds with key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(excludes(arr, vals, key)).toEqual([1, 3, 4]);
  });

  it('succeeds with deep key on non-objects', () => {
    const arr = [1, 2, 3];
    const vals = [1, 3, 4];
    const key = 'a.b';
    expect(excludes(arr, vals, key)).toEqual([1, 3, 4]);
  });
});
