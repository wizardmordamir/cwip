"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDupsPrimitive = void 0;
const removeDupsPrimitive = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0)
        return [];
    return [...new Set(arr)];
};
exports.removeDupsPrimitive = removeDupsPrimitive;
