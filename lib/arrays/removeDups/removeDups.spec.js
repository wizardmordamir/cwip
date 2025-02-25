import { removeDups } from '.';

describe('removeDupsPrimitive', () => {
  it('removes duplicate primitives', () => {
    const arr = [1, 2, 3, 3, 2, 1, 5];
    expect(removeDups(arr)).toEqual([1, 2, 3, 5]);
  });

  it('removes duplicate objects', () => {
    const arr = [{ a: 1 }, { a: 1 }];
    expect(removeDups(arr)).toEqual([{ a: 1 }]);
  });

  it('handles empty array', () => {
    const arr = [];
    expect(removeDups(arr)).toEqual([]);
  });

  it('removes mixed duplicates', () => {
    const arr = [1, { a: 1 }, 2, { a: 1 }, 1];
    expect(removeDups(arr)).toEqual([1, { a: 1 }, 2]);
  });
});
