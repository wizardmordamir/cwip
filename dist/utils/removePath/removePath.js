"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePath = exports.removePathSync = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const removePathSync = (path, config = {}) => {
    try {
        // Use rmSync with recursive and force options to remove files/directories/symlinks
        node_fs_1.default.rmSync(path, { force: true, recursive: true, maxRetries: 3, retryDelay: 100, ...config });
    }
    catch (error) {
        // Ignore errors, as we want to force remove the path
    }
};
exports.removePathSync = removePathSync;
const removePath = async (path, config = {}) => {
    try {
        // Use rm with recursive and force options to remove files/directories/symlinks
        await node_fs_1.default.promises.rm(path, {
            force: true,
            recursive: true,
            maxRetries: 3,
            retryDelay: 100,
            ...config,
        });
    }
    catch (error) {
        // Ignore errors, as we want to force remove the path
    }
};
exports.removePath = removePath;
