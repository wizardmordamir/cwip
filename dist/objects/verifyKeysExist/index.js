"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allKeysExist = exports.throwIfMissingKeys = exports.getMissingKeys = void 0;
const getMissingKeys = (obj, keys) => {
    const missingKeys = [];
    for (const key of keys) {
        if (!(key in obj)) {
            missingKeys.push(key);
        }
    }
    return missingKeys.length ? missingKeys : undefined;
};
exports.getMissingKeys = getMissingKeys;
const throwIfMissingKeys = (obj, keys) => {
    const missingKeys = (0, exports.getMissingKeys)(obj, keys);
    if (missingKeys) {
        throw new Error(`Missing keys: ${missingKeys.join(', ')}`);
    }
};
exports.throwIfMissingKeys = throwIfMissingKeys;
const allKeysExist = (obj, keys) => !!(0, exports.getMissingKeys)(obj, keys);
exports.allKeysExist = allKeysExist;
