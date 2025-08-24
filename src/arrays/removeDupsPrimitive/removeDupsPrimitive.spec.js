import { removeDupsPrimitive } from '.';

describe('removeDupsPrimitive', () => {
  it('removes duplicate primitives', () => {
    const arr = [1, 2, 3, 3, 2, 1, 5];
    expect(removeDupsPrimitive(arr)).toEqual([1, 2, 3, 5]);
  });

  it('does not remove duplicate objects', () => {
    const arr = [{ a: 1 }, { a: 1 }];
    expect(removeDupsPrimitive(arr)).toEqual([{ a: 1 }, { a: 1 }]);
  });

  it('handles empty array', () => {
    const arr = [];
    expect(removeDupsPrimitive(arr)).toEqual([]);
  });
});
