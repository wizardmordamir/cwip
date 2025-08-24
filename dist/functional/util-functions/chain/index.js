"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chain = void 0;
const chain = (fn) => (x) => x.chain(fn);
exports.chain = chain;
exports.default = exports.chain;
