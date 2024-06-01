"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartLog = exports.handleError = exports.smartLogSettings = void 0;
const log_1 = require("../log");
const __1 = require("..");
exports.smartLogSettings = {
    timer: 300000,
    groupInclusions: [], // add strings from logs to use to group
};
const handleError = (err, prefix = '') => {
    const errMsg = (0, __1.getMessageFromError)(err);
    if ((0, __1.shouldLogMessage)(errMsg, prefix)) {
        log_1.logSettings.logger.error(prefix, errMsg);
    }
    return errMsg;
};
exports.handleError = handleError;
const groups = {};
const unblockLogging = (key) => {
    delete groups[key];
};
const startBlockLoggingTimer = (key, timer = exports.smartLogSettings.timer) => {
    if (groups[key]) {
        return;
    }
    groups[key] = true;
    setTimeout(() => {
        unblockLogging(key);
    }, timer);
};
// use log when you want to avoid logging the same message repeatedly
// identical messages cannot occur within a time limit in ms
// identical messages are further limited by shouldLogMessage checks
// errors can be added at the end of vals to automatically get their appropriate messages
// ex. log('error', 'connectionError', [prefix, err]);
const smartLog = ({ type = 'error', group = '', vals = [], stackLimit = 5, skipShouldLogMessageCheck = false, depth = 3, timer = exports.smartLogSettings.timer, }) => {
    try {
        const joinedVals = vals.join(',');
        if (!group) {
            for (let i = 0; i < exports.smartLogSettings.groupInclusions.length; i++) {
                if (joinedVals.includes(exports.smartLogSettings.groupInclusions[i])) {
                    group = exports.smartLogSettings.groupInclusions[i];
                    break;
                }
            }
        }
        if (!group || !groups[group]) {
            if (group) {
                startBlockLoggingTimer(group || joinedVals, timer);
            }
            if (skipShouldLogMessageCheck || (0, __1.shouldLogMessage)(joinedVals)) {
                let updatedLogVals;
                if (type === 'error' && vals[vals.length - 1] instanceof Error) {
                    updatedLogVals = [...vals.slice(0, -1), (0, __1.getMessageFromError)(vals[-1], '', stackLimit)];
                }
                if (group) {
                    log_1.logSettings.logger[type](group, ...(updatedLogVals || vals));
                }
                else {
                    log_1.logSettings.logger[type](...(updatedLogVals || vals));
                }
            }
        }
    }
    catch (err) {
        log_1.logSettings.logger.error({
            type,
            group,
            vals,
            stackLimit,
            skipShouldLogMessageCheck,
            depth,
        }, (0, __1.getMessageFromError)(err));
    }
};
exports.smartLog = smartLog;
