import { describe, expect, it } from 'bun:test';
import { allKeysExist, getMissingKeys, throwIfMissingKeys } from '.';

describe('verifyKeysExist', () => {
  describe('getMissingKeys', () => {
    it('should return missing keys', () => {
      // No casts needed: keys may be any PropertyKey, not just keyof the object.
      const missingKeys = getMissingKeys({ a: 1, b: 2 }, ['a', 'b', 'c', 'd']);
      expect(missingKeys).toEqual(['c', 'd']);
    });

    it('should return empty array if no keys are missing', () => {
      const missingKeys = getMissingKeys({ a: 1, b: 2 }, ['a', 'b']);
      expect(missingKeys).toEqual([]);
    });
  });

  describe('throwIfMissingKeys', () => {
    it('should throw if keys are missing', () => {
      expect(() => throwIfMissingKeys({ a: 1, b: 2 }, ['a', 'b', 'c'])).toThrow('Missing keys: c');
    });

    it('should not throw if no keys are missing', () => {
      expect(() => throwIfMissingKeys({ a: 1, b: 2 }, ['a', 'b'])).not.toThrow();
    });
  });

  describe('allKeysExist', () => {
    it('should return true if all keys exist', () => {
      expect(allKeysExist({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    });

    it('should return false if some keys are missing', () => {
      expect(allKeysExist({ a: 1, b: 2 }, ['a', 'b', 'c'])).toBe(false);
    });
  });
});
