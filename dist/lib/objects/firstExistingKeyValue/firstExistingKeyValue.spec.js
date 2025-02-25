"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('firstExistingKeyValue', () => {
    it('should get first existing key value', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, _1.firstExistingKeyValue)(['b', 1, 'a', 'c', 2], val)).toEqual(1);
    });
});
