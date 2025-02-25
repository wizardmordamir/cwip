"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('deepClone', () => {
    it('should deep clone', () => {
        const val = { ref: { a: 1, b: null, c: { d: 1 } } };
        const clone = (0, _1.deepClone)(val);
        expect(clone).toEqual(val);
        val.ref.c.d = 2;
        expect(clone.ref.c.d).toEqual(1);
    });
});
