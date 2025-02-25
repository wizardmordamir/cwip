"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('getMissingKeys', () => {
    it('should get missing keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.getMissingKeys)(['a', 'b', 'c', 'd', 'e', 'f'], val)).toEqual(['d', 'e', 'f']);
    });
    it('should get no missing keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.getMissingKeys)(['a', 'b', 'c'], val)).toEqual([]);
    });
});
