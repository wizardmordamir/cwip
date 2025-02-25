"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.find = void 0;
/* eslint-disable */
const __1 = require("../..");
exports.find = (0, __1.curry)((fn, array) => array.find(fn));
