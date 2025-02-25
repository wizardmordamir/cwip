"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludesKeys = void 0;
const arrays_1 = require("../../arrays");
const excludesKeys = (keys, obj) => (0, arrays_1.excludes)(Object.keys(obj), keys);
exports.excludesKeys = excludesKeys;
