"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSymLink = exports.isSymLinkSync = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const tryOr_1 = require("../tryOr");
const isSymLinkSync = (path) => {
    return (0, tryOr_1.tryOr)(() => node_fs_1.default.statSync(path).isSymbolicLink(), false);
};
exports.isSymLinkSync = isSymLinkSync;
const isSymLink = async (path) => {
    return (0, tryOr_1.tryOrAsync)(() => node_fs_1.default.promises.stat(path).then((stats) => stats.isSymbolicLink()), false);
};
exports.isSymLink = isSymLink;
