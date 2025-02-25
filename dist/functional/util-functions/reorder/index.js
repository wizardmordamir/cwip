"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorder = void 0;
const curry_1 = require("../curry");
const fn = (fromIndex, toIndex, array) => {
    if (array === null || array === undefined) {
        return [];
    }
    const arrayCopy = [...array];
    const [itemToMove] = arrayCopy.splice(fromIndex, 1);
    arrayCopy.splice(toIndex, 0, itemToMove);
    return arrayCopy;
};
exports.reorder = (0, curry_1.curry)(fn);
