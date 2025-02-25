"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('removeKeys', () => {
    it('should remove keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        const expected = { a: 1 };
        expect((0, _1.removeKeys)(['b', 'c'], val)).toEqual(expected);
    });
    it('should remove no keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.removeKeys)(['d', 'e', 'f'], val)).toEqual(val);
    });
});
