"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeKeysMutate = void 0;
const removeKeysMutate = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        delete obj[keys[i]];
    }
    return obj;
};
exports.removeKeysMutate = removeKeysMutate;
