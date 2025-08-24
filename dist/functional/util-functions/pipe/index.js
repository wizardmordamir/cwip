"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipe = void 0;
const pipe = (...fns) => (...args) => fns.reduce((res, fn) => [fn.call(null, ...res)], args)[0];
exports.pipe = pipe;
exports.default = exports.pipe;
