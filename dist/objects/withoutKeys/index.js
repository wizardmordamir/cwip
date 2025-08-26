"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withoutKeys = void 0;
const withoutKeys = (obj, keys) => {
    if (typeof obj !== 'object' || obj === null)
        return obj;
    if (!Array.isArray(keys))
        return obj;
    if (keys.length === 0)
        return obj;
    if (Object.keys(obj).length === 0)
        return obj;
    const entries = Object.entries(obj);
    return Object.fromEntries(entries.filter(([key]) => !keys.includes(key)));
};
exports.withoutKeys = withoutKeys;
