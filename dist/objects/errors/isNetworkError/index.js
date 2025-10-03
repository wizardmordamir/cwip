"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNetworkError = exports.defaultNetworkErrorIndicators = void 0;
const js_types_1 = require("../../../js-types");
exports.defaultNetworkErrorIndicators = [
    'ETIMEOUT',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'ESOCKET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETDOWN',
    'ENETRESET',
    'ENETUNREACH',
    'EAI_AGAIN',
    'EPIPE',
    'ECONNABORTED',
    'EADDRINUSE',
    'EADDRNOTAVAIL',
    'EHOSTDOWN',
    'ENOTCONN',
    'ESHUTDOWN',
];
const isNetworkError = (err, networkErrorIndicators = exports.defaultNetworkErrorIndicators) => {
    if (!err || typeof err !== 'object')
        return false;
    if ('code' in err && typeof err.code === 'string') {
        return networkErrorIndicators.includes(err.code);
    }
    if (!('message' in err) || typeof err.message !== 'string')
        return false;
    return (0, js_types_1.stringIncludesAny)(networkErrorIndicators, err.message);
};
exports.isNetworkError = isNetworkError;
