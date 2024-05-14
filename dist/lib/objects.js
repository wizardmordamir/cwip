"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeKeys = exports.getMissingKeys = exports.hasAllKeys = exports.hasKey = exports.firstExistingKeyValue = exports.firstExistingKey = exports.stringify = exports.excludesKeys = exports.extend = exports.deepClone = exports.shallowClone = void 0;
const types_1 = require("./types");
const arrays_1 = require("./arrays");
const shallowClone = (obj) => Object.assign({}, obj);
exports.shallowClone = shallowClone;
const deepClone = (obj) => structuredClone(obj);
exports.deepClone = deepClone;
const extend = (...objects) => Object.assign({}, ...objects);
exports.extend = extend;
const excludesKeys = (keys, obj) => (0, arrays_1.excludes)(Object.keys(obj), keys);
exports.excludesKeys = excludesKeys;
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
// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 'b'
const firstExistingKey = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        if ((0, types_1.existy)(obj[keys[i]])) {
            return keys[i];
        }
    }
};
exports.firstExistingKey = firstExistingKey;
// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 2
const firstExistingKeyValue = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        if ((0, types_1.existy)(obj[keys[i]])) {
            return obj[keys[i]];
        }
    }
};
exports.firstExistingKeyValue = firstExistingKeyValue;
const hasKey = (key, obj) => Object.prototype.hasOwnProperty.call(obj, key);
exports.hasKey = hasKey;
const hasAllKeys = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        if (!(0, exports.hasKey)(keys[i], obj)) {
            return false;
        }
    }
    return true;
};
exports.hasAllKeys = hasAllKeys;
const getMissingKeys = (keys, obj) => keys.filter((key) => !(0, exports.hasKey)(key, obj));
exports.getMissingKeys = getMissingKeys;
const removeKeys = (keys, obj) => {
    for (let i = 0; i < keys.length; i++) {
        delete obj[keys[i]];
    }
    return obj;
};
exports.removeKeys = removeKeys;
