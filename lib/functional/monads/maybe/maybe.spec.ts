import { Maybe } from '.';
const onFail = (v) => `I failed with value: ${v}`;

describe('Maybe', () => {
  describe('passesChecker', () => {
    it('should be true when value checks out', () => {
      expect(Maybe(onFail, Boolean, {}).passesChecker()).toBe(true);
      expect(Maybe(onFail, Boolean, []).passesChecker()).toBe(true);
      expect(Maybe(onFail, Boolean, 'test').passesChecker()).toBe(true);
    });

    it('should be false when value fails check', () => {
      expect(Maybe(onFail, Boolean, 0).passesChecker()).toBe(false);
      expect(Maybe(onFail, Boolean, false).passesChecker()).toBe(false);
      expect(Maybe(onFail, Boolean, '').passesChecker()).toBe(false);
      expect(Maybe(onFail, Boolean, undefined).passesChecker()).toBe(false);
      expect(Maybe(onFail, Boolean, null).passesChecker()).toBe(false);
    });
  });

  describe('join', () => {
    it('should return the value when joined', () => {
      expect(Maybe(onFail, Boolean, {}).join()).toEqual({});
      expect(Maybe(onFail, Boolean, []).join()).toEqual([]);
      expect(Maybe(onFail, Boolean, 'test').join()).toEqual('test');
      expect(Maybe(onFail, Boolean, undefined).join()).toEqual('I failed with value: undefined');
      expect(Maybe(onFail, Boolean, null).join()).toEqual('I failed with value: null');
      expect(Maybe(onFail, Boolean, 0).join()).toEqual('I failed with value: 0');
    });
  });

  describe('map', () => {
    it('should apply function(s) to value', () => {
      const isNotNaN = (x) => !isNaN(x);
      expect(
        Maybe(onFail, isNotNaN, 0)
          .map((x) => x + 1)
          .join(),
      ).toEqual(1);
      expect(
        Maybe(onFail, isNotNaN, 0)
          .map((x) => x + 1)
          .map((x) => x + 1)
          .join(),
      ).toEqual(2);
    });

    it('should not apply function when value is nothing', () => {
      const inc = jest.fn((value) => value + 1);
      const undefinedValue = Maybe(onFail, Boolean, undefined);
      const nullValue = Maybe(onFail, Boolean, null);
      const badValue = Maybe(onFail, Boolean, 0).map(() => null);
      expect(undefinedValue.map(inc).join()).toEqual('I failed with value: undefined');
      expect(nullValue.map(inc).join()).toEqual('I failed with value: null');
      expect(badValue.map(inc).join()).toEqual('I failed with value: 0');
      expect(inc).not.toHaveBeenCalled();
    });
  });

  describe('chain', () => {
    it('should apply function(s) and return the value', () => {
      const isNotNaN = (x) => !isNaN(x);
      expect(Maybe(onFail, isNotNaN, 0).chain((x) => x + 1)).toEqual(1);
      expect(
        Maybe(onFail, isNotNaN, 0)
          .map((x) => x + 1)
          .chain((x) => x + 1),
      ).toEqual(2);
    });

    it('should not apply function when value is nothing', () => {
      const isNotNaNOrNull = (x) => !isNaN(x) && x !== null;
      expect(Maybe(onFail, Boolean, undefined).chain((x) => x + 1)).toEqual(
        'I failed with value: undefined',
      );
      expect(Maybe(onFail, Boolean, null).chain((x) => x + 1)).toEqual('I failed with value: null');
      expect(
        Maybe(onFail, isNotNaNOrNull, 0)
          .map(() => null)
          .chain((x) => x + 1),
      ).toEqual('I failed with value: null');
    });
  });
});
