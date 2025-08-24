"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldLogMessage = exports.cleanDataForLogging = exports.cleanStringForLogging = exports.updateLoggingSettings = exports.loggingSettings = void 0;
const times_1 = require("./times");
const js_types_1 = require("./js-types");
const objects_1 = require("./objects");
exports.loggingSettings = {
    disableSameMessagesLimit: false,
    redactionText: 'HIDDEN',
    secretProps: [],
    messagesPerHour: 2,
    priorMessages: {},
};
const updateLoggingSettings = (settings) => {
    for (const key in settings) {
        exports.loggingSettings[key] = settings[key];
    }
};
exports.updateLoggingSettings = updateLoggingSettings;
const cleanStringForLogging = (str, env) => {
    exports.loggingSettings.secretProps.forEach((secretProp) => {
        if (env[secretProp]) {
            str.replaceAll(env[secretProp], exports.loggingSettings.redactionText);
        }
    });
    return str;
};
exports.cleanStringForLogging = cleanStringForLogging;
const cleanDataForLogging = (opts, env) => {
    if (!opts) {
        return opts;
    }
    if ((0, js_types_1.isString)(opts)) {
        return (0, exports.cleanStringForLogging)(opts, env);
    }
    const optsClone = JSON.parse((0, objects_1.stringify)(opts));
    if (optsClone.auth) {
        optsClone.auth = exports.loggingSettings.redactionText;
    }
    if (optsClone.headers?.authorization) {
        optsClone.headers.authorization = exports.loggingSettings.redactionText;
    }
    if (optsClone.response?.config) {
        delete optsClone.response.config;
    }
    const cleanStringJSON = (0, exports.cleanDataForLogging)((0, objects_1.stringify)(optsClone), env);
    return JSON.parse(cleanStringJSON);
};
exports.cleanDataForLogging = cleanDataForLogging;
const shouldLogMessage = (message, group = 'default') => {
    if (!message) {
        return true;
    }
    if (exports.loggingSettings.disableSameMessagesLimit) {
        return true;
    }
    // set up new groups
    if (!exports.loggingSettings.priorMessages[group]) {
        exports.loggingSettings.priorMessages[group] = [];
    }
    if (!exports.loggingSettings.priorMessages[group][message]) {
        exports.loggingSettings.priorMessages[group][message] = { date: new Date(), count: 1 };
        return true;
    }
    // check if enough time has elapsed since counter began
    if ((0, times_1.hoursPastDate)(exports.loggingSettings.priorMessages[group][message].date) > 1) {
        exports.loggingSettings.priorMessages[group][message].date = new Date();
        exports.loggingSettings.priorMessages[group][message].count = 1;
        return true;
    }
    // check if more messages are allowed
    if (exports.loggingSettings.priorMessages[group][message].count < exports.loggingSettings.messagesPerHour) {
        exports.loggingSettings.priorMessages[group][message].count++;
        return true;
    }
    // count is too high
    exports.loggingSettings.priorMessages[group][message].count++;
    return false;
};
exports.shouldLogMessage = shouldLogMessage;
