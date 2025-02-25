"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeKeys = void 0;
const removeKeys = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        delete obj[keys[i]];
    }
    return obj;
};
exports.removeKeys = removeKeys;
