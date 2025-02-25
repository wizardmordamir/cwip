"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('isNetworkError', () => {
    it('returns true for network errors', () => {
        for (const indicator of _1.defaultNetworkErrorIndicators) {
            let err = new Error(`Network Error ${indicator}`);
            expect((0, _1.isNetworkError)(err)).toBe(true);
            err = new Error(`${indicator} Network Error`);
            expect((0, _1.isNetworkError)(err)).toBe(true);
            err = new Error(`Network ${indicator} Error`);
            expect((0, _1.isNetworkError)(err)).toBe(true);
        }
    });
    it('returns false for non-network errors', () => {
        const err = new Error('Error');
        expect((0, _1.isNetworkError)(err)).toBe(false);
    });
});
