"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduce = void 0;
const reduce = (reducerFn, initialValue) => (arr) => arr.reduce(reducerFn, initialValue);
exports.reduce = reduce;
