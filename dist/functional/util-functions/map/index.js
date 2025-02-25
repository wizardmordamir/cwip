"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.map = void 0;
const map = (fn) => (x) => {
    return x.map(fn);
};
exports.map = map;
exports.default = { map: exports.map };
