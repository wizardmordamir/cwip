"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartLogger = exports.smartLog = exports.handleError = exports.smartLogSettings = void 0;
const __1 = require("..");
const __2 = require("..");
exports.smartLogSettings = {
    timer: 300_000,
    groupInclusions: [], // add strings from logs to use to group
};
const handleError = (err, prefix = '') => {
    const errMsg = (0, __2.getMessageFromError)(err);
    if ((0, __2.shouldLogMessage)(errMsg, prefix)) {
        __1.logSettings.logger.error(prefix, errMsg);
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
// use when you want to avoid logging the same message repeatedly
// identical messages cannot occur within a time limit in ms
// identical messages are further limited by shouldLogMessage checks
// errors can be added at the end of vals to automatically get their appropriate messages
// ex. log('error', 'connectionError', [prefix, err]);
const smartLog = ({ type = 'error', group = '', vals = [], skipShouldLogMessageCheck = false, depth, timer = exports.smartLogSettings.timer, }) => {
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
            if (skipShouldLogMessageCheck || (0, __2.shouldLogMessage)(joinedVals)) {
                let updatedLogVals;
                if (type === 'error' && vals[vals.length - 1] instanceof Error) {
                    updatedLogVals = [...vals.slice(0, -1), (0, __2.getMessageFromError)(vals[-1], '')];
                }
                if (group) {
                    __1.logSettings.depth(depth, type, group, ...(updatedLogVals || vals));
                }
                else {
                    __1.logSettings.depth(depth, type, ...(updatedLogVals || vals));
                }
            }
        }
    }
    catch (err) {
        console.log('smartLog err:', err);
    }
};
exports.smartLog = smartLog;
// set up a logger to use smartLog with optional defaults for these params
// group, vals, skipShouldLogMessageCheck, depth, timer
// It can be called like this:
// smartLogger(defaults).error('error:', error))
const smartLogger = ({ group, vals, skipShouldLogMessageCheck, depth, timer, }) => {
    // these are the same for each log type
    const defaultSmartLogParams = { group, skipShouldLogMessageCheck, depth, timer };
    return {
        error: (...args) => (0, exports.smartLog)({ ...defaultSmartLogParams, type: 'error', vals: [...vals, ...args] }),
        trace: (...args) => (0, exports.smartLog)({ ...defaultSmartLogParams, type: 'trace', vals: [...vals, ...args] }),
        debug: (...args) => (0, exports.smartLog)({ ...defaultSmartLogParams, type: 'debug', vals: [...vals, ...args] }),
        info: (...args) => (0, exports.smartLog)({ ...defaultSmartLogParams, type: 'info', vals: [...vals, ...args] }),
        warn: (...args) => (0, exports.smartLog)({ ...defaultSmartLogParams, type: 'warn', vals: [...vals, ...args] }),
    };
};
exports.smartLogger = smartLogger;
