"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstExistingKeyValue = void 0;
// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 2
const firstExistingKeyValue = (values, obj) => {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        if (values.includes(obj[keys[i]])) {
            return obj[keys[i]];
        }
    }
};
exports.firstExistingKeyValue = firstExistingKeyValue;
