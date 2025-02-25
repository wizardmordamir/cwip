"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
describe('withoutKeys', () => {
    it('should remove keys from object', () => {
        const val = { a: 1, b: null, c: { d: 1 } };
        expect((0, __1.withoutKeys)(val, ['b', 'c'])).toEqual({ a: 1 });
    });
});
