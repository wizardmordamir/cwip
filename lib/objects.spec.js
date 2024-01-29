import {
  deepClone,
  excludesKeys,
  extend,
  firstExistingProp,
  firstExistingPropValue,
  shallowClone,
  stringify,
} from './objects';

describe('objects', () => {
  describe('shallowClone', () => {
    it('should shallow clone', () => {
      const val = {
        ref: { a: 1, b: null, c: { d: 1 } },
      };
      const clone = shallowClone(val);
      expect(clone).toEqual(val);
      val.ref.c.d = 2;
      expect(clone.ref.c.d).toEqual(2);
    });
  });

  describe('deepClone', () => {
    it('should deep clone', () => {
      const val = {
        ref: { a: 1, b: null, c: { d: 1 } },
      };
      const clone = deepClone(val);
      expect(clone).toEqual(val);
      val.ref.c.d = 2;
      expect(clone.ref.c.d).toEqual(1);
    });
  });

  describe('excludesKeys', () => {
    it('should find missing keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(excludesKeys(obj, keys)).toEqual(['d', 'e', 'f']);
    });
  });

  describe('extend', () => {
    it('should extend objects', () => {
      const vals = [{ a: 1 }, { b: 2 }];
      expect(extend(...vals)).toEqual({ a: 1, b: 2 });
    });
  });

  describe('stringify', () => {
    it('should stringify with circular reference', () => {
      const val = {
        ref: { a: 1, b: null, c: { d: 1 } },
      };
      const val2 = {
        ref: { a: 1, b: null, c: { d: 1 } },
      };
      val.ref.g = val.ref;
      const result = JSON.parse(stringify(val));
      expect(result).toEqual(val2);
      expect(result.ref.g).toBeUndefined();
    });
  });

  describe('firstExistingProp', () => {
    it('should get first existing prop from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingProp(val, ['b', 1, 'a', 'c', 2])).toEqual('a');
    });

    it('should get first existing prop from params', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingProp(val, 'b', 1, 'a', 'c', 2)).toEqual('a');
    });

    it('should get first existing prop from params', () => {
      const val = { a: 1, b: null, c: { d: 1 }, 3: '3' };
      expect(firstExistingProp(val, 'b', 1, 'ab', 'cd', 2, 3)).toEqual(3);
    });

    it('should not have first existing prop from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingProp(val, ['b', 1, 'ab', 'cd', 2])).toEqual(undefined);
    });

    it('should not have first existing prop from params', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingProp(val, 'b', 1, 'ab', 'cd', 2)).toEqual(undefined);
    });
  });

  describe('firstExistingPropValue', () => {
    it('should get first existing prop value from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingPropValue(val, ['b', 1, 'a', 'c', 2])).toEqual(1);
    });

    it('should get first existing prop value from params', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingPropValue(val, 'b', 1, 'a', 'c', 2)).toEqual(1);
    });

    it('should get first existing prop value from params', () => {
      const val = { a: 1, b: null, c: { d: 1 }, 3: '3' };
      expect(firstExistingPropValue(val, 'b', 1, 'ab', 'cd', 2, 3)).toEqual('3');
    });

    it('should not have first existing prop value from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingPropValue(val, ['b', 1, 'ab', 'cd', 2])).toEqual(undefined);
    });

    it('should not have first existing prop value from params', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingPropValue(val, 'b', 1, 'ab', 'cd', 2)).toEqual(undefined);
    });
  });
});
