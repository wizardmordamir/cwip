import { ifIt } from '.';

const evalFn = jest.fn((v) => v === true || v === 'true');
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
      expect(ifIt(true, doWork, true)).toBe(1);
      expect(ifIt('true', doWork, 'true')).toBe(0);
      expect(ifIt(true, doWork, false)).toBe(0);
      expect(ifIt(false, doWork, false)).toBe(false);
    });
  });
});
