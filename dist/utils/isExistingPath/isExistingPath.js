"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExistingPath = exports.isExistingPathSync = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const tryOr_1 = require("../tryOr");
const isExistingPathSync = (path) => {
    return (0, tryOr_1.tryOr)(() => node_fs_1.default.existsSync(path), false);
};
exports.isExistingPathSync = isExistingPathSync;
const isExistingPath = async (path) => {
    return (0, tryOr_1.tryOrAsync)(async () => {
        await node_fs_1.default.promises.access(path);
        return true;
    }, false);
};
exports.isExistingPath = isExistingPath;
