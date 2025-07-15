"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageFromError = exports.dbConnectionErrors = void 0;
const js_types_1 = require("../../../js-types");
const showStackForError_1 = require("../showStackForError");
const removeModulesFromStack_1 = require("../removeModulesFromStack");
exports.dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];
const getMessageFromError = (error) => {
    try {
        if (!error) {
            return '';
        }
        if ((0, js_types_1.isString)(error)) {
            error = new Error(error);
        }
        const showStack = (0, showStackForError_1.showStackForError)(error);
        let msg = '';
        const baseErrorMessage = error.message || error;
        msg += ` ${baseErrorMessage}`;
        if (showStack) {
            msg += `, stack:\n${(0, removeModulesFromStack_1.removeModulesFromStack)(error).stack}`;
        }
        return msg.trim();
    }
    catch (err) {
        return error;
    }
};
exports.getMessageFromError = getMessageFromError;
