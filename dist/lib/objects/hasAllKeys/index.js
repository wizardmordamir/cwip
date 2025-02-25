"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAllKeys = void 0;
const __1 = require("..");
const hasAllKeys = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        if (!(0, __1.hasKey)(keys[i], obj)) {
            return false;
        }
    }
    return true;
};
exports.hasAllKeys = hasAllKeys;
