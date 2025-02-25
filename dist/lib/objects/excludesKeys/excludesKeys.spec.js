"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('excludesKeys', () => {
    it('should find missing keys', () => {
        const obj = { a: 1, b: 2, c: 3 };
        const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
        expect((0, _1.excludesKeys)(keys, obj)).toEqual(['d', 'e', 'f']);
    });
});
