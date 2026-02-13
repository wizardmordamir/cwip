"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDir = exports.isDirSync = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const tryOr_1 = require("../tryOr");
const isDirSync = (path) => {
    return (0, tryOr_1.tryOr)(() => node_fs_1.default.statSync(path).isDirectory(), false);
};
exports.isDirSync = isDirSync;
const isDir = async (path) => {
    return (0, tryOr_1.tryOrAsync)(() => node_fs_1.default.promises.stat(path).then((stats) => stats.isDirectory()), false);
};
exports.isDir = isDir;
