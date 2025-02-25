"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMonad = void 0;
const curry_1 = require("../../util-functions/curry");
const index_1 = require("../index");
exports.ErrorMonad = (0, curry_1.curry)((evaluator, success, errorMessage, x) => {
    return evaluator(x) ? (0, index_1.Identity)(success(x)) : (0, index_1.ShortCircuit)(new Error(errorMessage));
});
exports.default = exports.ErrorMonad;
