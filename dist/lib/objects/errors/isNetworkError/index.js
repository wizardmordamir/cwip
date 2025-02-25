"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNetworkError = exports.defaultNetworkErrorIndicators = void 0;
const js_types_1 = require("../../../js-types");
exports.defaultNetworkErrorIndicators = ['ETIMEOUT', 'ENOTFOUND', 'ECONNRESET', 'ESOCKET'];
const isNetworkError = (err, networkErrorIndicators = exports.defaultNetworkErrorIndicators) => err && err.message && (0, js_types_1.stringIncludesAny)(networkErrorIndicators, err.message);
exports.isNetworkError = isNetworkError;
