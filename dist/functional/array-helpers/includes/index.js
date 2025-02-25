"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.includes = void 0;
const __1 = require("../..");
exports.includes = (0, __1.curry)((value, array) => array.includes(value));
