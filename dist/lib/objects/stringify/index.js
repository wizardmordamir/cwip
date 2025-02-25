"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = void 0;
// safely stringify with circular references
const stringify = (obj, spaces = 2) => {
    const cache = [];
    return JSON.stringify(obj, function (key, val) {
        if (typeof val === 'object' && val !== null) {
            if (cache.indexOf(val) !== -1) {
                return;
            }
            cache.push(val);
        }
        return val;
    }, spaces);
};
exports.stringify = stringify;
