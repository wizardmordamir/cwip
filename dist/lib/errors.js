"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageFromError = exports.showStackForError = exports.removeModulesFromStack = exports.isAxiosError = exports.isPMIErr = exports.isNetworkErr = exports.skipStackErrorMessages = exports.skipStackErrorCodes = void 0;
const logging_1 = require("./logging");
const objects_1 = require("./objects");
const types_1 = require("./types");
const showStackLogLevels = ['trace', 'debug'];
exports.skipStackErrorCodes = ['EREQUEST', 'credentials_required'];
exports.skipStackErrorMessages = ['does not exist in remedy for provisioning'];
// export const dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];
const networkErrorStrings = ['ETIMEOUT', 'ENOTFOUND', 'ECONNRESET', 'ESOCKET'];
const PMIErrorStrings = [
    '<td>Your request could not be processed. Request could not be handled</td>',
];
const isNetworkErr = (err) => err && err.message && (0, types_1.stringIncludesAny)(networkErrorStrings, err.message);
exports.isNetworkErr = isNetworkErr;
const isPMIErr = (err) => err && err.message && (0, types_1.stringIncludesAny)(PMIErrorStrings, err.message);
exports.isPMIErr = isPMIErr;
const isAxiosError = (err) => !!err.response;
exports.isAxiosError = isAxiosError;
const removeStackLinesIncluding = ['/node_modules/', 'internal/'];
const removeModulesFromStack = (err) => {
    if (!err.stack) {
        return;
    }
    const newStack = err.stack.split('\n').reduce((acc, line) => {
        if (removeStackLinesIncluding.some((removeLine) => line.includes(removeLine))) {
            return acc;
        }
        if (!line.includes('/')) {
            return acc;
        }
        return [...acc, line];
    }, []);
    err.stack = newStack.join('\n');
    return err;
};
exports.removeModulesFromStack = removeModulesFromStack;
const showStackForError = function showStackForError(error) {
    if (!error || !error.stack) {
        return false;
    }
    // network error stacks are not helpful
    if ((0, exports.isNetworkErr)(error)) {
        return false;
    }
    if (error.code && exports.skipStackErrorCodes.includes(error.code)) {
        return false;
    }
    if (error.message) {
        for (let i = 0; i < exports.skipStackErrorMessages.length; i++) {
            if (error.message.includes(exports.skipStackErrorMessages[i])) {
                return false;
            }
        }
    }
    // axios error stacks are not helpful
    if ((0, exports.isAxiosError)(error)) {
        return false;
    }
    return true;
};
exports.showStackForError = showStackForError;
const getMessageFromError = (error, prefix = '') => {
    var _a;
    try {
        if (!error) {
            return '';
        }
        if ((0, types_1.isString)(error)) {
            error = new Error(error);
        }
        const showStack = (0, exports.showStackForError)(error);
        // remove password and other axios config before logging;
        delete error.config;
        let axiosResponse;
        if ((0, exports.isAxiosError)(error)) {
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
            stringifiedError = (0, objects_1.stringify)(error);
        }
        if (stringifiedError &&
            stringifiedError !== '{}' &&
            stringifiedError !== (0, objects_1.stringify)(baseErrorMessage)) {
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
                axiosMethod = error.response.config.method && ((_a = error.response.config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase());
                delete error.response.config;
            }
            msg += ' ' + `url: ${axiosMethod || ''} ${axiosStatus || ''} ${axiosURL || ''}`.trim();
            stringifiedAxiosResponse = (0, objects_1.stringify)(axiosResponse);
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
            msg += `, stack:\n${(0, exports.removeModulesFromStack)(error).stack}`;
        }
        return (0, logging_1.cleanDataForLogging)(msg.trim());
    }
    catch (err) {
        console.error(`${prefix} second err:`, err.message, err.stack);
        console.error(`${prefix} Failed making first message for initial error:`, error.message, (0, exports.removeModulesFromStack)(error).stack);
    }
};
exports.getMessageFromError = getMessageFromError;
