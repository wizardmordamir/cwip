"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArgLast = exports.getArgAt = exports.getArg = void 0;
const getArg = (...args) => {
    return args[0];
};
exports.getArg = getArg;
const getArgAt = (index) => (...args) => {
    return args[index];
};
exports.getArgAt = getArgAt;
const getArgLast = (...args) => {
    return args[args.length - 1];
};
exports.getArgLast = getArgLast;
exports.default = exports.getArg;
