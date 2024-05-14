"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalMemory = exports.freeMemory = exports.getLoadPastMinute = exports.loadAvg = void 0;
const conversions_1 = require("./conversions");
const math_1 = require("./math");
const os_1 = __importDefault(require("os"));
const defaultPrecision = 8;
// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// only ever [0, 0, 0] on Windows os
const loadAvg = function (precision = defaultPrecision) {
    return os_1.default.loadavg().map((load) => (0, math_1.setPrecision)(precision, load));
};
exports.loadAvg = loadAvg;
// return load averages for past minute at set precision
const getLoadPastMinute = function (precision = defaultPrecision) {
    return (0, math_1.setPrecision)(precision, os_1.default.loadavg()[0]);
};
exports.getLoadPastMinute = getLoadPastMinute;
// get free memory in bytes or converted, ex. 2737586176
const freeMemory = function (convertType = 'bytes') {
    return (0, conversions_1.convertBytesTo)(os_1.default.freemem(), convertType);
};
exports.freeMemory = freeMemory;
// get total memory in bytes or converted
const totalMemory = function (convertTo = 'bytes') {
    return (0, conversions_1.convertBytesTo)(os_1.default.totalmem(), convertTo);
};
exports.totalMemory = totalMemory;
