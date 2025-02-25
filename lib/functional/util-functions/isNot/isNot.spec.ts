import { isNot, isObject } from '..';

describe('isNot', () => {
  describe('eval functions', () => {
    it('should use evaluator function and negate', () => {
      expect(isNot(isObject, {})).toBe(false);
      expect(isNot(isObject, null)).toBe(true);
      expect(isNot(isObject, undefined)).toBe(true);
      // curried
      expect(isNot(isObject)({})).toBe(false);
      expect(isNot(isObject)(null)).toBe(true);
      expect(isNot(isObject)(undefined)).toBe(true);
    });
  });
  describe('eval value', () => {
    it('should evaluate with static values and negate', () => {
      expect(isNot(true, null)).toBe(false);
      expect(isNot('true', null)).toBe(false);
      expect(isNot(false, null)).toBe(true);
      // curried
      expect(isNot(true)(null)).toBe(false);
      expect(isNot('true')(null)).toBe(false);
      expect(isNot(false)(null)).toBe(true);
    });
  });
});
