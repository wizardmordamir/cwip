"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('firstExistingKey', () => {
    it('should get first existing key from array', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.firstExistingKey)(['b', 1, 'a', 'c', 2], val)).toEqual('a');
    });
    it('should not have first existing key from array', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.firstExistingKey)(['b', 1, 'ab', 'cd', 2], val)).toEqual(undefined);
    });
});
