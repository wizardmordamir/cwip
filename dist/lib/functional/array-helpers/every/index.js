"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.every = void 0;
/* eslint-disable */
const __1 = require("../..");
exports.every = (0, __1.curry)((fn, array) => array.every(fn));
