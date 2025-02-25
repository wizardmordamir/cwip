"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showStackForError = exports.skipStackErrorCodes = void 0;
const isAxiosError_1 = require("../isAxiosError");
const isNetworkError_1 = require("../isNetworkError");
exports.skipStackErrorCodes = ['EREQUEST', 'credentials_required'];
const showStackForError = function showStackForError(error) {
    if (!error || !error.stack) {
        return false;
    }
    if ((0, isAxiosError_1.isAxiosError)(error)) {
        return false;
    }
    // network error stacks are not helpful
    if ((0, isNetworkError_1.isNetworkError)(error)) {
        return false;
    }
    if (error.code && exports.skipStackErrorCodes.includes(error.code)) {
        return false;
    }
    return true;
};
exports.showStackForError = showStackForError;
