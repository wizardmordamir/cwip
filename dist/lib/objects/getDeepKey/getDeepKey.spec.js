"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('getDeepKey', () => {
    it('gets a key in the deepest object', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c')).toEqual(1);
    });
    it('gets a key not in the deepest object', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.e')).toEqual(3);
    });
    it('returns undefined for missing key', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a.b.c.d')).toBeUndefined();
    });
    it('returns undefined for deeper missing key', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a.b.c.d.e.f')).toBeUndefined();
    });
    it('returns undefined for missing key on non-object', () => {
        expect((0, _1.getDeepKey)(1, 'a.b.c')).toBeUndefined();
    });
    it('uses a specified separator in the deepest object', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a/b/c', '/')).toEqual(1);
    });
    it('gets a deep key with a specified separator not in the deepest object', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/e', '/')).toEqual(3);
    });
    it('uses a specified separator with missing key', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a/b/c/d', '/')).toBeUndefined();
    });
    it('gets a deep key with an array field', () => {
        expect((0, _1.getDeepKey)({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a.b.1.c')).toEqual(2);
    });
    it('gets a missing key with an array field', () => {
        expect((0, _1.getDeepKey)({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a.b.3.c')).toBeUndefined();
    });
    it('gets a missing key with a number and no array field', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a.b.3.c')).toBeUndefined();
    });
    it('gets a missing key with a number and no array field with separator', () => {
        expect((0, _1.getDeepKey)({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a/b/3/c', '/')).toBeUndefined();
    });
    it('gets a missing key with a key number and no array field with separator', () => {
        expect((0, _1.getDeepKey)({ a: { b: { c: 1 } } }, 'a/b/3/c', '/')).toBeUndefined();
    });
    it('gets a deep key by a numeric field', () => {
        expect((0, _1.getDeepKey)({ a: { 1: { c: 1 } } }, 'a.1.c')).toEqual(1);
    });
    it('gets a deep key by a numeric field that does not exist', () => {
        expect((0, _1.getDeepKey)({ a: { 1: { c: 1 } } }, 'a.2.c')).toBeUndefined();
    });
});
