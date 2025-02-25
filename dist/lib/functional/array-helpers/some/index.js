"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.some = void 0;
/* eslint-disable */
const __1 = require("../..");
exports.some = (0, __1.curry)((fn, array) => array.some(fn));
