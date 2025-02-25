"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = void 0;
const isObject = (value) => {
    return Boolean(value &&
        (Object.getPrototypeOf(value) === null || value.constructor === Object) &&
        value !== null);
};
exports.isObject = isObject;
