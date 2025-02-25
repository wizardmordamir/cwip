"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withoutKeys = void 0;
const withoutKeys = (obj, keys) => {
    const newObj = {};
    for (const key in obj) {
        if (!keys.includes(key)) {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};
exports.withoutKeys = withoutKeys;
