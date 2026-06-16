import { describe, expect, it } from 'bun:test';
import { without } from '.';

describe('without', () => {
  it('removes values with key', () => {
    const key = 'a';
    const vals = [1, 3, 4];
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    // leaves only the object with a value of 2 for key a, since 1 and 3 are in vals and 4 is not in arr
    expect(without(vals, key, arr)).toEqual([{ a: 2 }]);
  });
});
