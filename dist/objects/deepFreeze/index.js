"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepFreeze = void 0;
const deepFreeze = (object) => {
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
        const value = object[name];
        if (value && typeof value === 'object') {
            (0, exports.deepFreeze)(value);
        }
    }
    Object.freeze(object);
    return object;
};
exports.deepFreeze = deepFreeze;
