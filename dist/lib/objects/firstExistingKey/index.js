"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstExistingKey = void 0;
const js_types_1 = require("../../js-types");
// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 'b'
const firstExistingKey = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        if ((0, js_types_1.existy)(obj[keys[i]])) {
            return keys[i];
        }
    }
};
exports.firstExistingKey = firstExistingKey;
