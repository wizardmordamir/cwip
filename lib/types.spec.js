import { zip } from './arrays';
import {
  containsString,
  existy,
  isEmpty,
  isFunction,
  isNumber,
  isObject,
  isPrimitive,
  isString,
  truthy,
} from './types';

const strings = ['', 'stringy'];

const booleans = [true, false];

// finite numbers only
const numbers = [1, 0, -1];

const functions = [() => {}, function () {}];

const objects = [{}, new Object()];

const arrays = [[], [1], new Array()];

const otherTypes = [null, undefined, Symbol(), NaN, Infinity, -Infinity];

const primitives = [
  ...strings,
  ...booleans,
  ...numbers,
  NaN,
  undefined,
  Infinity,
  -Infinity,
  Symbol(),
];

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

  describe('isPrimitive', () => {
    it('should check for primitives', () => {
      const wrongTypes = [...objects, ...arrays];
      const wrong = zip(wrongTypes, Array(wrongTypes.length).fill(false));
      wrong.forEach((val) => {
        expect([val[0], isPrimitive(val[0])]).toEqual([val[0], val[1]]);
      });
      primitives.forEach((fn) => {
        expect([fn, isPrimitive(fn)]).toEqual([fn, true]);
      });
    });
  });

  describe('isFunction', () => {
    it('should check for function', () => {
      const wrongTypes = [...strings, ...numbers, ...booleans, ...objects, ...otherTypes];
      const wrong = zip(wrongTypes, Array(wrongTypes.length).fill(false));
      wrong.forEach((val) => {
        expect([val[0], isFunction(val[0])]).toEqual([val[0], val[1]]);
      });
      functions.forEach((fn) => {
        expect([fn, isFunction(fn)]).toEqual([fn, true]);
      });
    });
  });

  describe('isString', () => {
    it('should check for string', () => {
      const wrongTypes = [...functions, ...numbers, ...booleans, ...objects, ...otherTypes];
      const wrong = zip(wrongTypes, Array(wrongTypes.length).fill(false));
      wrong.forEach((val) => {
        expect([val[0], isString(val[0])]).toEqual([val[0], val[1]]);
      });
      strings.forEach((fn) => {
        expect([fn, isString(fn)]).toEqual([fn, true]);
      });
    });
  });

  describe('isNumber', () => {
    it('should check for number', () => {
      const wrongTypes = [...functions, ...strings, ...booleans, ...objects, ...otherTypes];
      const wrong = zip(wrongTypes, Array(wrongTypes.length).fill(false));
      wrong.forEach((val) => {
        expect([val[0], isNumber(val[0])]).toEqual([val[0], val[1]]);
      });
      numbers.forEach((fn) => {
        expect([fn, isNumber(fn)]).toEqual([fn, true]);
      });
    });
  });

  describe('containsString', () => {
    it('should contain string insensitive', () => {
      const str = 'hello';
      const sub = 'ello';
      expect(containsString(str, sub, true)).toEqual(true);
    });
    it('should not contain string insensitive', () => {
      const str = 'hello';
      const sub = 'ello1';
      expect(containsString(str, sub, true)).toEqual(false);
    });
    it('should contain string sensitive', () => {
      const str = 'hEllO';
      const sub = 'EllO';
      expect(containsString(str, sub)).toEqual(true);
    });
    it('should not contain string sensitive', () => {
      const str = 'hEllO';
      const sub = 'ello';
      expect(containsString(str, sub)).toEqual(false);
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

  describe('isEmpty', () => {
    it('should find empty', () => {
      const truthy = [
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
      expect(truthy.map(isEmpty)).toEqual(Array(truthy.length).fill(true));
      const falsy = [{ a: 1 }, { a: { b: '' } }, { a: { b: [''] } }];
      expect(falsy.map(isEmpty)).toEqual(Array(falsy.length).fill(false));
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
