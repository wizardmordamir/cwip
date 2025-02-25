"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = void 0;
const isEmpty = (value) => {
    if (value === null || value === undefined) {
        return true;
    }
    return !Object.keys(value).length;
};
exports.isEmpty = isEmpty;
