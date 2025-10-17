import { allKeysExist, getMissingKeys, throwIfMissingKeys } from '.';

describe('verifyKeysExist', () => {
  describe('getMissingKeys', () => {
    it('should return missing keys', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b', 'c', 'd'] as (keyof typeof obj)[];
      const missingKeys = getMissingKeys(obj, keys);
      expect(missingKeys).toEqual(['c', 'd']);
    });

    it('should return empty array if no keys are missing', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b'] as (keyof typeof obj)[];
      const missingKeys = getMissingKeys(obj, keys);
      expect(missingKeys).toEqual([]);
    });
  });

  describe('throwIfMissingKeys', () => {
    it('should throw if keys are missing', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b', 'c'] as (keyof typeof obj)[];
      expect(() => throwIfMissingKeys(obj, keys)).toThrow('Missing keys: c');
    });

    it('should not throw if no keys are missing', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b'] as (keyof typeof obj)[];
      expect(() => throwIfMissingKeys(obj, keys)).not.toThrow();
    });
  });

  describe('allKeysExist', () => {
    it('should return true if all keys exist', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b'] as (keyof typeof obj)[];
      const result = allKeysExist(obj, keys);
      expect(result).toBe(true);
    });

    it('should return false if some keys are missing', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'b', 'c'] as (keyof typeof obj)[];
      const result = allKeysExist(obj, keys);
      expect(result).toBe(false);
    });
  });
});
