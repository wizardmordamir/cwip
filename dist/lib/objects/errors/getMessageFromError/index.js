"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageFromError = exports.dbConnectionErrors = void 0;
const logging_1 = require("../../../logging");
const __1 = require("../..");
const js_types_1 = require("../../../js-types");
const showStackForError_1 = require("../showStackForError");
const removeModulesFromStack_1 = require("../removeModulesFromStack");
const isAxiosError_1 = require("../isAxiosError");
exports.dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];
const getMessageFromError = (error, prefix = '') => {
    try {
        if (!error) {
            return '';
        }
        if ((0, js_types_1.isString)(error)) {
            error = new Error(error);
        }
        const showStack = (0, showStackForError_1.showStackForError)(error);
        // remove password and other axios config before logging;
        delete error.config;
        let axiosResponse;
        if ((0, isAxiosError_1.isAxiosError)(error)) {
            if (error.response.data && Array.isArray(error.response.data) && error.response.data[0]) {
                axiosResponse = error.response.data[0];
            }
            else {
                axiosResponse = error.response.data || error.response;
            }
        }
        let msg = prefix;
        const baseErrorMessage = error.message || error;
        if (!axiosResponse) {
            msg += ` error: ${baseErrorMessage}`;
        }
        let stringifiedError;
        if (!axiosResponse) {
            stringifiedError = (0, __1.stringify)(error);
        }
        if (stringifiedError &&
            stringifiedError !== '{}' &&
            stringifiedError !== (0, __1.stringify)(baseErrorMessage)) {
            msg += `, stringified: ${stringifiedError}`;
        }
        let stringifiedAxiosResponse;
        if (axiosResponse) {
            let axiosURL;
            let axiosMethod;
            let axiosStatus;
            axiosStatus = error.response.status;
            if (error.response.config) {
                axiosURL = error.response.config.url;
                axiosMethod = error.response.config.method && error.response.config.method?.toUpperCase();
                delete error.response.config;
            }
            msg += ' ' + `url: ${axiosMethod || ''} ${axiosStatus || ''} ${axiosURL || ''}`.trim();
            stringifiedAxiosResponse = (0, __1.stringify)(axiosResponse);
        }
        if (stringifiedAxiosResponse) {
            if (stringifiedAxiosResponse.includes('<html>')) {
                msg += ', axios response: <html removed>';
            }
            else {
                msg += `, axios response: ${stringifiedAxiosResponse}`;
            }
        }
        if (showStack) {
            msg += `, stack:\n${(0, removeModulesFromStack_1.removeModulesFromStack)(error).stack}`;
        }
        return (0, logging_1.cleanDataForLogging)(msg.trim());
    }
    catch (err) {
        return error;
    }
};
exports.getMessageFromError = getMessageFromError;
