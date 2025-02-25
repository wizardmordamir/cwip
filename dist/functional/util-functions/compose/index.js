"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = void 0;
const compose = (...fns) => (...args) => fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];
exports.compose = compose;
exports.default = exports.compose;
