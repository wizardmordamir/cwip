"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lstatSafe = exports.lstatSafeSync = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const tryOr_1 = require("../tryOr");
const lstatSafeSync = (path) => {
    return (0, tryOr_1.tryOr)(() => node_fs_1.default.lstatSync(path), null);
};
exports.lstatSafeSync = lstatSafeSync;
const lstatSafe = async (path) => {
    return (0, tryOr_1.tryOrAsync)(() => node_fs_1.default.promises.lstat(path), null);
};
exports.lstatSafe = lstatSafe;
