"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludes = void 0;
const objects_1 = require("../../objects");
const excludes = (arr, vals, deepKey, separator = '.') => {
    const arrSet = deepKey
        ? new Set(arr.map((a) => (0, objects_1.getDeepKey)(a, deepKey, separator)))
        : new Set(arr);
    return vals.filter((val) => !arrSet.has(deepKey ? val : val));
};
exports.excludes = excludes;
