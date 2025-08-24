"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggit = void 0;
const loggit = (...args) => (value) => {
    console.log(...args, value);
    return value;
};
exports.loggit = loggit;
