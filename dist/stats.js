"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalMemory = exports.freeMemory = exports.getLoadPastMinute = exports.loadAvg = void 0;
const byteConversions_1 = require("./byteConversions");
const math_1 = require("./math");
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
let os;
if (isNode) {
    const loadOs = async () => {
        os = await Promise.resolve().then(() => __importStar(require('os')));
    };
    loadOs();
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
