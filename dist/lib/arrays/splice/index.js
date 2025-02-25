"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splice = void 0;
const splice = (arr, start, deleteCount = 1, ...items) => {
    arr.splice(start, deleteCount, ...items);
    return arr;
};
exports.splice = splice;
