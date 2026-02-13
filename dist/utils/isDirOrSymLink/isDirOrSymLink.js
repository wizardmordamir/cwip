"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDirOrSymLink = exports.isDirOrSymLinkSync = void 0;
const isSymLink_1 = require("../isSymLink/isSymLink");
const isDir_1 = require("../isDir/isDir");
const isDirOrSymLinkSync = (path) => {
    return (0, isDir_1.isDirSync)(path) || (0, isSymLink_1.isSymLinkSync)(path);
};
exports.isDirOrSymLinkSync = isDirOrSymLinkSync;
const isDirOrSymLink = async (path) => {
    return (0, isDir_1.isDir)(path) || (0, isSymLink_1.isSymLink)(path);
};
exports.isDirOrSymLink = isDirOrSymLink;
