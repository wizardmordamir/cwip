import { without } from '.';

describe('without', () => {
  it('removes values with key', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const vals = [1, 3, 4];
    const key = 'a';
    expect(without(arr, vals, key)).toEqual([{ a: 2 }]);
  });
});
