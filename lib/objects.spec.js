import {
  deepClone,
  excludesKeys,
  extend,
  firstExistingKey,
  firstExistingKeyValue,
  getMissingKeys,
  hasAllKeys,
  hasKey,
  removeKeys,
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
      expect(excludesKeys(keys, obj)).toEqual(['d', 'e', 'f']);
    });
  });

  describe('extend', () => {
    it('should extend objects', () => {
      const vals = [{ a: 1 }, { b: 2 }];
      expect(extend(...vals)).toEqual({ a: 1, b: 2 });
    });
  });

  describe('getMissingKeys', () => {
    it('should get missing keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(getMissingKeys(['a', 'b', 'c', 'd', 'e', 'f'], val)).toEqual(['d', 'e', 'f']);
    });

    it('should get no missing keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(getMissingKeys(['a', 'b', 'c'], val)).toEqual([]);
    });
  });

  describe('hasAllKeys', () => {
    it('should find all keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(hasAllKeys(['a', 'b', 'c'], val)).toEqual(true);
    });

    it('should not find all keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(hasAllKeys(['a', 'b', 'c', 'd', 'e', 'f'], val)).toEqual(false);
    });
  });

  describe('hasKey', () => {
    it('should find all keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(hasKey('c', val)).toEqual(true);
    });

    it('should not find all keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(hasKey('f', val)).toEqual(false);
    });
  });

  describe('removeKeys', () => {
    it('should remove keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      const expected = { a: 1 };
      expect(removeKeys(['b', 'c'], val)).toEqual(expected);
    });

    it('should remove no keys', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(removeKeys(['d', 'e', 'f'], val)).toEqual(val);
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

  describe('firstExistingKey', () => {
    it('should get first existing key from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingKey(['b', 1, 'a', 'c', 2], val)).toEqual('a');
    });

    it('should not have first existing key from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingKey(['b', 1, 'ab', 'cd', 2], val)).toEqual(undefined);
    });
  });

  describe('firstExistingKeyValue', () => {
    it('should get first existing key value from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingKeyValue(['b', 1, 'a', 'c', 2], val)).toEqual(1);
    });

    it('should not have first existing prop value from array', () => {
      const val = { a: 1, b: null, c: { d: 1 } };
      expect(firstExistingKeyValue(val, ['b', 1, 'ab', 'cd', 2])).toEqual(undefined);
    });
  });
});
