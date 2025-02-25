"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeObjects = void 0;
/* eslint-disable */
const curry_1 = require("../curry");
exports.mergeObjects = (0, curry_1.curry)((objA, objB) => ({ ...objA, ...objB }));
