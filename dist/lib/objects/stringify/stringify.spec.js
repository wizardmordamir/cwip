"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('stringify', () => {
    it('should stringify with circular reference', () => {
        const val = {
            ref: { a: 1, b: null, c: { d: 1 } },
        };
        const val2 = {
            ref: { a: 1, b: null, c: { d: 1 } },
        };
        val.ref.g = val.ref;
        const result = JSON.parse((0, _1.stringify)(val));
        expect(result).toEqual(val2);
        expect(result.ref.g).toBeUndefined();
    });
});
