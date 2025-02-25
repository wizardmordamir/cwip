"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayChunker = void 0;
const curry_1 = require("../curry");
const fn = (chunkSize, array) => {
    const newArray = [...array];
    const chunk = newArray.splice(0, chunkSize);
    return newArray.length > chunkSize
        ? [chunk, ...fn(chunkSize, newArray)]
        : [chunk, newArray].filter((arr) => arr.length !== 0);
};
exports.arrayChunker = (0, curry_1.curry)(fn);
