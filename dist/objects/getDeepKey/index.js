"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeepKey = void 0;
const getDeepKey = (obj, deepKey, separator = '.') => {
    if (!obj || !deepKey)
        return undefined;
    if (typeof obj !== 'object')
        return undefined;
    if (typeof deepKey !== 'string')
        return undefined;
    if (!deepKey.includes(separator))
        return obj[deepKey];
    return deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
};
exports.getDeepKey = getDeepKey;
