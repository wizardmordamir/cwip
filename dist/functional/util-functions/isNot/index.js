"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNot = void 0;
const curry_1 = require("../curry");
exports.isNot = (0, curry_1.curry)((evaluator, value) => {
    return typeof evaluator === 'function' ? !evaluator(value) : !evaluator;
});
