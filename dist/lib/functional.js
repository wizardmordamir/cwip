"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.curry = exports.ifIt = void 0;
const types_1 = require("./types");
const ifIt = (cond, action, val) => ((0, types_1.truthy)(cond) ? action(val) : val);
exports.ifIt = ifIt;
const inner = (fn) => (...args) => args.length >= fn.length ? fn(...args) : (...more) => (0, exports.curry)(fn)(...args, ...more);
// note fn.length changes when there are rest or default params
const curry = (fn) => inner(fn);
exports.curry = curry;
