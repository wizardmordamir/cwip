"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingKeys = void 0;
const __1 = require("..");
const getMissingKeys = (keys, obj) => keys.filter((key) => !(0, __1.hasKey)(key, obj));
exports.getMissingKeys = getMissingKeys;
