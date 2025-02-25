"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('extend', () => {
    it('should extend objects', () => {
        const vals = [{ a: 1 }, { b: 2 }];
        expect((0, _1.extend)(...vals)).toEqual({ a: 1, b: 2 });
    });
});
