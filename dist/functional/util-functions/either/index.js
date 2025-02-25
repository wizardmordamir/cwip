"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.either = void 0;
/* eslint-disable */
const curry_1 = require("../curry");
exports.either = (0, curry_1.curry)((evaluator, success, fail) => (...args) => {
    const evaluated = typeof evaluator === 'function' ? evaluator(...args) : evaluator;
    return evaluated ? success(...args) : fail(...args);
});
