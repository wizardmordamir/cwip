"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ifIt = void 0;
const __1 = require("..");
exports.ifIt = (0, __1.curry)((evaluator, fn, value) => {
    const evaluated = typeof evaluator === 'function' ? evaluator(value) : evaluator;
    return evaluated ? fn(value) : value;
});
