import { excludes, without, removePrimitiveDups, includes, zip } from './arrays';

describe('arrays', () => {
  describe('excludes', () => {
    it('finds vals not in array', () => {
      const arr = [1, 2, 3];
      const vals = [1, 3, 4];
      expect(excludes(arr, vals)).toEqual([4]);
    });
  });

  describe('without', () => {
    it('removes values with keys', () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const vals = [1, 3, 4];
      const key = 'a';
      expect(without(arr, vals, key)).toEqual([{ a: 2 }]);
    });
    it('removes values without keys', () => {
      const arr = [1, 2, 3];
      const vals = [1, 3, 4];
      expect(without(arr, vals)).toEqual([2]);
    });
  });

  describe('removePrimitiveDups', () => {
    it('removes duplicate primitives', () => {
      const arr = [1, 2, 3, 3, 2, 1, 5];
      expect(removePrimitiveDups(arr)).toEqual([1, 2, 3, 5]);
    });
    it('does not remove duplicate objects', () => {
      const arr = [{ a: 1 }, { a: 1 }];
      expect(removePrimitiveDups(arr)).toEqual([{ a: 1 }, { a: 1 }]);
    });
  });

  describe('includes', () => {
    it('finds values with keys', () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const vals = [1, 3, 4];
      const key = 'a';
      expect(includes(arr, vals, key)).toEqual([true, true, false]);
    });
    it('finds values without keys', () => {
      const arr = [1, 2, 3];
      const vals = [1, 3, 4];
      expect(includes(arr, vals)).toEqual([true, true, false]);
    });
  });

  describe('zip', () => {
    it('zips multiple arrays', () => {
      const arrays = [
        [1, 2],
        [1, 2],
        [1, 2],
      ];
      const expected = [
        [1, 1, 1],
        [2, 2, 2],
      ];
      expect(zip(...arrays)).toEqual(expected);
    });

    it('zips multiple arrays with different lengths', () => {
      const arrays = [
        [1, 2],
        [1, 2, 3, 4],
        [1, 2, 3],
      ];
      const expected = [
        [1, 1, 1],
        [2, 2, 2],
      ];
      expect(zip(...arrays)).toEqual(expected);
    });
  });
});
