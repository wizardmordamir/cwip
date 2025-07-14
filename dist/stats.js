"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalMemory = exports.freeMemory = exports.getLoadPastMinute = exports.loadAvg = void 0;
const byteConversions_1 = require("./byteConversions");
const math_1 = require("./math");
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
let os;
if (isNode) {
    os = require('os');
}
const defaultPrecision = 8;
const envErrorMessage = 'stats are only available in Node.js';
// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// only ever [0, 0, 0] on Windows os
const loadAvg = function (precision = defaultPrecision) {
    if (!isNode || !os)
        throw new Error(envErrorMessage);
    return os.loadavg().map((load) => (0, math_1.setPrecision)(precision, load));
};
exports.loadAvg = loadAvg;
// return load averages for past minute at set precision
const getLoadPastMinute = function (precision = defaultPrecision) {
    if (!isNode || !os)
        throw new Error(envErrorMessage);
    return (0, math_1.setPrecision)(precision, os.loadavg()[0]);
};
exports.getLoadPastMinute = getLoadPastMinute;
// get free memory in bytes or converted, ex. 2737586176
const freeMemory = function (convertType = 'bytes') {
    if (!isNode || !os)
        throw new Error(envErrorMessage);
    return (0, byteConversions_1.convertBytesTo)(os.freemem(), convertType);
};
exports.freeMemory = freeMemory;
// get total memory in bytes or converted
const totalMemory = function (convertTo = 'bytes') {
    if (!isNode || !os)
        throw new Error(envErrorMessage);
    return (0, byteConversions_1.convertBytesTo)(os.totalmem(), convertTo);
};
exports.totalMemory = totalMemory;
