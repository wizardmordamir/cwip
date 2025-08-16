"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeStringify = exports.isString = void 0;
const safeTypes = ['boolean', 'number'];
const isString = (value) => typeof value === 'string';
exports.isString = isString;
const safeStringify = (obj, seen = new WeakSet()) => {
    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if ((0, exports.isString)(obj)) {
        return obj;
    }
    if (typeof obj === 'symbol') {
        return obj.toString();
    }
    if (typeof obj === 'function') {
        return obj.toString();
    }
    if (safeTypes.includes(typeof obj)) {
        return JSON.stringify(obj);
    }
    if (seen.has(obj)) {
        return '[Circular]';
    }
    try {
        seen.add(obj);
    }
    catch (err) { }
    if (Array.isArray(obj)) {
        return '[' + obj.map((item) => (0, exports.safeStringify)(item, seen)).join(', ') + ']';
    }
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        const result = {};
        for (const key of keys) {
            const value = obj[key];
            result[key] = (0, exports.safeStringify)(value, seen);
        }
        return JSON.stringify(result);
    }
    return JSON.stringify(obj);
};
exports.safeStringify = safeStringify;
