"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringIncludesAny = exports.isEmptyDeep = exports.isObjectNotArray = exports.isString = exports.isNumber = exports.isFunction = exports.isPrimitive = exports.containsString = exports.truthy = exports.existy = void 0;
const existy = (val) => typeof val !== 'undefined' && val !== null;
exports.existy = existy;
const truthy = (val) => val !== false && (0, exports.existy)(val);
exports.truthy = truthy;
const containsString = (string, substr, insensitive = false) => !insensitive
    ? string.indexOf(substr) > -1
    : string.toUpperCase().indexOf(substr.toUpperCase()) > -1;
exports.containsString = containsString;
const isPrimitive = (val) => val === null || !(typeof val === 'object' || typeof val === 'function');
exports.isPrimitive = isPrimitive;
const isFunction = (val) => typeof val === 'function';
exports.isFunction = isFunction;
const isNumber = (val) => Number.isFinite(val);
exports.isNumber = isNumber;
// false for instanceof String
const isString = (val) => typeof val === 'string';
exports.isString = isString;
const isObjectNotArray = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);
exports.isObjectNotArray = isObjectNotArray;
// return true if all keys in obj are either not existy, empty arrays, or empty objects
const isEmptyDeep = (obj) => (0, exports.isPrimitive)(obj)
    ? !(0, exports.existy)(obj)
    : Array.isArray(obj)
        ? obj.every((a) => (0, exports.isEmptyDeep)(a))
        : Object.keys(obj).every((k) => Array.isArray(obj[k])
            ? obj[k].every((a) => (0, exports.isEmptyDeep)(a))
            : (0, exports.isObjectNotArray)(obj[k])
                ? (0, exports.isEmptyDeep)(obj[k])
                : !(0, exports.existy)(obj[k]));
exports.isEmptyDeep = isEmptyDeep;
const stringIncludesAny = (strings, string, insensitive = false) => {
    if (insensitive) {
        string = string.toLowerCase();
    }
    for (let i = 0; i < strings.length; i++) {
        if (string.includes(insensitive ? strings[i].toLowerCase() : strings[i])) {
            return true;
        }
    }
    return false;
};
exports.stringIncludesAny = stringIncludesAny;
