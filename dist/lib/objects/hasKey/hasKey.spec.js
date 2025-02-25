"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
describe('hasKey', () => {
    it('should find all keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, __1.hasKey)('c', val)).toEqual(true);
    });
    it('should not find all keys', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, __1.hasKey)('f', val)).toEqual(false);
    });
});
