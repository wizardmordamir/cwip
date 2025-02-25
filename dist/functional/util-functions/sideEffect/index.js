"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncSideEffect = exports.sideEffect = void 0;
const sideEffect = (fn) => (v) => {
    fn(v);
    return v;
};
exports.sideEffect = sideEffect;
const asyncSideEffect = (fn) => async (v) => {
    await fn(v);
    return Promise.resolve(v);
};
exports.asyncSideEffect = asyncSideEffect;
