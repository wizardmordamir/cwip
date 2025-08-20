"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withoutKeys = void 0;
const withoutKeys = (obj, keys) => {
    const entries = Object.entries(obj);
    return Object.fromEntries(entries.filter(([key]) => !keys.includes(key)));
};
exports.withoutKeys = withoutKeys;
