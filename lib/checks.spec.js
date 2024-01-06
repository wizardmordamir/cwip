import { containsString, existy, isEmpty, isObject, missingKeys, truthy } from './checks';

describe('arrays', () => {
  describe('existy', () => {
    it('should be existy', () => {
      const vals = [0, 1, false, true, '', 'a', {}, []];
      expect(vals.map(existy)).toEqual(Array(vals.length).fill(true));
    });
    it('should not be existy', () => {
      const vals = [null, undefined];
      expect(vals.map(existy)).toEqual(Array(vals.length).fill(false));
    });
  });

  describe('truthy', () => {
    it('should be truthy', () => {
      const vals = [1, true, 'a', {}, [], '', 0];
      expect(vals.map(truthy)).toEqual(Array(vals.length).fill(true));
    });
    it('should not be truthy', () => {
      const vals = [null, undefined, false];
      expect(vals.map(truthy)).toEqual(Array(vals.length).fill(false));
    });
  });

  describe('containsString', () => {
    it('should contain string insensitive', () => {
      const str = 'hello';
      const sub = 'ello';
      expect(containsString(str, sub)).toEqual(true);
    });
    it('should not contain string insensitive', () => {
      const str = 'hello';
      const sub = 'ello1';
      expect(containsString(str, sub)).toEqual(false);
    });
    it('should contain string sensitive', () => {
      const str = 'hEllO';
      const sub = 'EllO';
      expect(containsString(str, sub, true)).toEqual(true);
    });
    it('should not contain string sensitive', () => {
      const str = 'hEllO';
      const sub = 'ello';
      expect(containsString(str, sub, true)).toEqual(false);
    });
  });

  describe('isObject', () => {
    it('should be object', () => {
      const vals = [{}, new Object(), Object.assign({}, {}), JSON.parse('{}'), new Set([1])];

      expect(vals.map(isObject)).toEqual(Array(vals.length).fill(true));
    });
    it('should not be object', () => {
      const vals = [null, undefined, false, [], 'a', 1, '', 0, true];
      expect(vals.map(isObject)).toEqual(Array(vals.length).fill(false));
    });
  });

  describe('missingKeys', () => {
    it('should find missing keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(missingKeys(obj, keys)).toEqual(['d', 'e', 'f']);
    });
  });

  describe('isEmpty', () => {
    it('should find empty', () => {
      const vals = [
        {},
        { a: [] },
        { a: {} },
        { a: [null] },
        { a: [{}] },
        { a: [null, {}] },
        { a: [{ a: [] }], b: undefined, c: null },
        { a: [{ a: [] }], b: undefined, c: [null, {}] },
        [],
        [{ a: [null] }, { a: null }, null, undefined],
        [{ a: { a: { a: { a: [{ a: [{}] }] } } } }],
      ];
      expect(vals.map(isEmpty)).toEqual(Array(vals.length).fill(true));
    });

    it('should find not empty', () => {
      const vals = [
        { a: '' },
        { a: [false] },
        { a: { a: { a: 0 } } },
        { a: [{ a: [false] }], b: undefined, c: null },
        { a: '' },
        { a: [{ a: [] }], b: undefined, c: [null, {}, 0] },
      ];
      expect(vals.map(isEmpty)).toEqual(Array(vals.length).fill(false));
    });
  });
});
