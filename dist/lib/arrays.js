"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zip = exports.removePrimitiveDups = exports.without = exports.includes = exports.excludes = void 0;
// checks for vals at top level
const excludes = (arr, vals) => vals.filter((val) => !arr.includes(val));
exports.excludes = excludes;
// checks for vals at top level or at key
const includes = (arr, vals, key) => vals.map((val) => (key ? !!arr.find((a) => a[key] === val) : arr.indexOf(val) !== -1));
exports.includes = includes;
// checks for vals at top level or at key
const without = (arr, vals, key) => arr.reduceRight((accum, item, i) => key
    ? vals.indexOf(item[key]) !== -1
        ? accum.toSpliced(i, 1)
        : accum
    : vals.indexOf(item) !== -1
        ? accum.toSpliced(i, 1)
        : accum, [...arr]);
exports.without = without;
const removePrimitiveDups = (arr) => [...new Set(arr)];
exports.removePrimitiveDups = removePrimitiveDups;
const zip = (...arr) => [...Array(Math.min(...arr.map((a) => a.length)))].map((_, i) => arr.map((a) => a[i]));
exports.zip = zip;
