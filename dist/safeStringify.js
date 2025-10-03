"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeStringifyIfNeeded = exports.safeStringify = void 0;
const js_types_1 = require("./js-types");
const safeTypes = ['boolean', 'number'];
function decycle(obj, seen = new WeakSet()) {
    if (typeof obj === 'undefined' ||
        obj === null ||
        safeTypes.includes(typeof obj) ||
        (0, js_types_1.isString)(obj)) {
        return obj;
    }
    if (typeof obj === 'symbol' || typeof obj === 'function') {
        return obj.toString();
    }
    if (seen.has(obj)) {
        return '[Circular]';
    }
    if (Array.isArray(obj)) {
        seen.add(obj);
        return obj.map((item) => decycle(item, seen));
    }
    if (typeof obj === 'object') {
        seen.add(obj);
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = decycle(obj[key], seen);
        }
        return result;
    }
    return obj;
}
const safeStringify = (obj, replacer, space) => {
    if (typeof obj === 'undefined')
        return undefined;
    if (obj === null)
        return 'null';
    if (typeof obj === 'string')
        return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean')
        return String(obj);
    if (typeof obj === 'symbol' || typeof obj === 'function')
        return obj.toString();
    return JSON.stringify(decycle(obj), replacer, space);
};
exports.safeStringify = safeStringify;
// takes same params as JSON.stringify
const safeStringifyIfNeeded = (obj, replacer, space) => {
    if (typeof obj === 'string')
        return obj;
    return (0, exports.safeStringify)(obj, replacer, space);
};
exports.safeStringifyIfNeeded = safeStringifyIfNeeded;
