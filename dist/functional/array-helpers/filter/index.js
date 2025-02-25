"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filter = void 0;
/* eslint-disable */
const __1 = require("../..");
exports.filter = (0, __1.curry)((fn, array) => array.filter(fn));
