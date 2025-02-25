"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.without = void 0;
const objects_1 = require("../../objects");
const without = (arr, vals, deepKey, separator = '.') => {
    const valsSet = new Set(vals);
    return arr.filter((item) => deepKey ? !valsSet.has((0, objects_1.getDeepKey)(item, deepKey, separator)) : !valsSet.has(item));
};
exports.without = without;
