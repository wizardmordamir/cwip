import { removeArrayValues, removePrimitiveDups, valsExistInArray } from './arrays';

describe('arrays', () => {
  describe('removeArrayValues', () => {
    it('removes values with keys', () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const vals = [1, 3, 4];
      const key = 'a';
      expect(removeArrayValues(arr, vals, key)).toEqual([{ a: 2 }]);
    });
    it('removes values without keys', () => {
      const arr = [1, 2, 3];
      const vals = [1, 3, 4];
      expect(removeArrayValues(arr, vals)).toEqual([2]);
    });
  });

  describe('removePrimitiveDups', () => {
    it('removes duplicate primitives', () => {
      const arr = [1, 2, 3, 3, 2, 1, 5];
      expect(removePrimitiveDups(arr)).toEqual([1, 2, 3, 5]);
    });
  });

  describe('valsExistInArray', () => {
    it('finds values with keys', () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const vals = [1, 3, 4];
      const key = 'a';
      expect(valsExistInArray(arr, vals, key)).toEqual([true, true, false]);
    });
    it('finds values without keys', () => {
      const arr = [1, 2, 3];
      const vals = [1, 3, 4];
      expect(valsExistInArray(arr, vals)).toEqual([true, true, false]);
    });
  });
});
