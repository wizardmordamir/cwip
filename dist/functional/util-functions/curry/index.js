"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.curry = void 0;
const inner = (fn) => (...args) => args.length >= fn.length ? fn(...args) : (...more) => (0, exports.curry)(fn)(...args, ...more);
const curry = (fn) => inner(fn);
exports.curry = curry;
