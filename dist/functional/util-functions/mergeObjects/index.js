"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeObjects = void 0;
/* eslint-disable */
const curry_1 = require("../curry");
exports.mergeObjects = (0, curry_1.curry)((objA, objB) => {
    if (typeof objA !== 'object' || objA === null || (Array.isArray(objA) && !Array.isArray(objB))) {
        return objA;
    }
    if (typeof objB !== 'object' || objB === null || Array.isArray(objB)) {
        return objB;
    }
    return { ...objA, ...objB };
});
