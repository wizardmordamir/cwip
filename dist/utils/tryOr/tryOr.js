"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryOrAsync = exports.tryOr = void 0;
const tryOr = (fn, defaultValue = false) => {
    try {
        return fn();
    }
    catch (e) {
        return defaultValue;
    }
};
exports.tryOr = tryOr;
const tryOrAsync = async (fn, defaultValue = false) => {
    try {
        return await fn();
    }
    catch (e) {
        return defaultValue;
    }
};
exports.tryOrAsync = tryOrAsync;
