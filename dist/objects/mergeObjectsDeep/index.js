"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeObjectsDeep = void 0;
const mergeDeep = (target, source, seen) => {
    if (typeof source !== 'object' || source === null)
        return source;
    if (seen.has(source))
        return seen.get(source);
    // If target is not an object, initialize as object or array
    if (typeof target !== 'object' || target === null) {
        target = Array.isArray(source) ? [] : {};
    }
    seen.set(source, target);
    Object.keys(source).forEach((key) => {
        const srcVal = source[key];
        if (Array.isArray(srcVal)) {
            target[key] = srcVal;
        }
        else if (typeof srcVal === 'object' && srcVal !== null) {
            target[key] = mergeDeep(target[key], srcVal, seen);
        }
        else {
            target[key] = srcVal;
        }
    });
    return target;
};
const mergeObjectsDeep = (...objects) => {
    const seen = new WeakMap();
    const merged = objects.reduce((acc, obj) => {
        return mergeDeep(acc, obj, seen);
    }, {});
    return structuredClone(merged);
};
exports.mergeObjectsDeep = mergeObjectsDeep;
