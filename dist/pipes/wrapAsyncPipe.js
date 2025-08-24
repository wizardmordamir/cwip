"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAsyncPipe = void 0;
const asyncPipe_1 = require("./asyncPipe");
const wrapAsyncPipe = (wrapper, errorHandler) => (...fns) => {
    const wrappedFns = fns.map(wrapper);
    return (initialValue) => {
        return (0, asyncPipe_1.asyncPipe)(...wrappedFns)(initialValue).catch(errorHandler);
    };
};
exports.wrapAsyncPipe = wrapAsyncPipe;
