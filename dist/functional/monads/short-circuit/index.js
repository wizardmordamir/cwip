"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortCircuit = void 0;
const ShortCircuit = (x) => ({
    map: () => (0, exports.ShortCircuit)(x),
    join: () => x,
    chain: () => (0, exports.ShortCircuit)(x).join(),
});
exports.ShortCircuit = ShortCircuit;
exports.default = exports.ShortCircuit;
