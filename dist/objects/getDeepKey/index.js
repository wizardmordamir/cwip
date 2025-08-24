"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeepKey = void 0;
const getDeepKey = (obj, deepKey, separator = '.') => deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
exports.getDeepKey = getDeepKey;
