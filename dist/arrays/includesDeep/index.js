"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.includesDeep = void 0;
const objects_1 = require("../../objects");
const includesDeep = (arr, vals, deepKey, separator = '.') => {
    if (arr?.length === 0 || vals?.length === 0)
        return [];
    if (!arr?.map)
        return [];
    if (!vals?.filter)
        return [];
    const set = new Set(arr.map((a) => (deepKey ? (0, objects_1.getDeepKey)(a, deepKey, separator) : a)));
    return vals.filter((val) => set.has(deepKey ? val : val));
};
exports.includesDeep = includesDeep;
