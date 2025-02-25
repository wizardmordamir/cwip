"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setValue = void 0;
const setValue = (setter) => (value) => ({ ...value, ...setter(value) });
exports.setValue = setValue;
