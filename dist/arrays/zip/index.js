"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zip = void 0;
const zip = (...arr) => [...Array(Math.min(...arr.map((a) => a.length)))].map((_, i) => arr.map((a) => a[i]));
exports.zip = zip;
