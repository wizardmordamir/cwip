"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduceKeys = void 0;
const reduceKeys = (obj, keys) => keys.reduce((accum, curr) => ({ ...accum, [curr]: obj[curr] }), {});
exports.reduceKeys = reduceKeys;
