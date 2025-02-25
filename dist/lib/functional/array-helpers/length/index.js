"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.length = void 0;
const length = (value) => value && typeof value === 'object' ? Object.keys(value).length : 0;
exports.length = length;
