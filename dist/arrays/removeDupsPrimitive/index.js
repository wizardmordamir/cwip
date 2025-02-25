"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDupsPrimitive = void 0;
const removeDupsPrimitive = (arr) => [...new Set(arr)];
exports.removeDupsPrimitive = removeDupsPrimitive;
