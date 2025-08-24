"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Maybe = void 0;
const util_functions_1 = require("../../util-functions");
exports.Maybe = (0, util_functions_1.curry)((onFail, checker, x) => ({
    passesChecker: () => checker(x),
    map: (fn) => (0, exports.Maybe)(onFail, checker, x).passesChecker()
        ? (0, exports.Maybe)(onFail, checker, fn(x))
        : (0, exports.Maybe)(onFail, checker, x),
    join: () => ((0, exports.Maybe)(onFail, checker, x).passesChecker() ? x : onFail(x)),
    chain: (fn) => (0, exports.Maybe)(onFail, checker, x).map(fn).join(),
}));
exports.default = exports.Maybe;
