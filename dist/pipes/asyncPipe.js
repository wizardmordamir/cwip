"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncPipe = void 0;
const asyncPipe = (...fns) => {
    return (initialValue) => {
        let result = Promise.resolve(initialValue);
        for (const fn of fns) {
            result = result.then(fn);
        }
        return result;
    };
};
exports.asyncPipe = asyncPipe;
