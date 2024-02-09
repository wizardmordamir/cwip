import { curry, ifIt } from './functional';

describe('functional', () => {
  describe('curry', () => {
    it('should curry fn', () => {
      const fn = curry((a, b, c) => a + b + c);
      expect(fn(3)(2)(1)).toEqual(6);
      expect(fn(3, 2)(1)).toEqual(6);
      expect(fn(3, 2, 1)).toEqual(6);
    });
  });

  describe('ifIt', () => {
    it('should happen if true', () => {
      let x;
      ifIt(true, () => (x = 1));
      expect(x).toBe(1);
    });
    it('should not happen if false', () => {
      let x = 0;
      ifIt(false, () => (x = 1));
      expect(x).toBe(0);
    });
  });
});
