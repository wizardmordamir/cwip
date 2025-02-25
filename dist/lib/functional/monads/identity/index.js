"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Identity = void 0;
const Identity = (x) => ({
    map: (fn) => (0, exports.Identity)(fn(x)),
    join: () => x,
    chain: (fn) => (0, exports.Identity)(x).map(fn).join(),
});
exports.Identity = Identity;
exports.default = exports.Identity;
