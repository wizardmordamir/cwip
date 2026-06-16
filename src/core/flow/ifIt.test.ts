import { describe, expect, it, mock } from 'bun:test';
import { ifIt } from '.';

const evalFn = mock((v) => v === true || v === 'true');
const doWork = (v) => (v === true ? 1 : 0);

describe('ifIt', () => {
  it('should be curry-able', () => {
    expect(ifIt(evalFn)(doWork)(true)).toBe(1);
    expect(ifIt(evalFn)(doWork)('true')).toBe(0);
    expect(ifIt(evalFn)(doWork)(false)).toBe(false);
  });
  describe('eval functions', () => {
    it('should evaluate and call second arg fn when true', () => {
      expect(ifIt(evalFn, doWork, true)).toBe(1);
      expect(ifIt(evalFn, doWork, 'true')).toBe(0);
      expect(ifIt(evalFn, doWork, false)).toBe(false);
    });
  });
  describe('eval functions', () => {
    it('should evaluate and call second arg fn when truthy', () => {
      // Use 'as any' to bypass the rigid function requirement
      expect(ifIt(true as any, doWork, true)).toBe(1);
      expect(ifIt('true' as any, doWork, 'true')).toBe(0);
    });
  });
});
