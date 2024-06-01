"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.getLineFromStack = exports.getFileFromStack = exports.logSettings = exports.validLogLevels = void 0;
const objects_1 = require("./objects");
exports.validLogLevels = ['trace', 'debug', 'info', 'warn', 'error'];
const traceIndex = exports.validLogLevels.indexOf('trace');
const debugIndex = exports.validLogLevels.indexOf('debug');
const infoIndex = exports.validLogLevels.indexOf('info');
const warnIndex = exports.validLogLevels.indexOf('warn');
const errorIndex = exports.validLogLevels.indexOf('error');
let currentConfig = {
    pino: null,
    name: '',
    prettyPrint: {
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname,v,name',
    },
    hideFile: false,
    hideTime: false,
    hideLine: false,
    useLocalTime: true,
    stackIndex: 3,
    level: 'info',
};
exports.logSettings = {
    logger: null,
    currentConfig,
};
let loggerUpdater;
const getFileFromStack = (stack, index) => stack[index].getFileName();
exports.getFileFromStack = getFileFromStack;
const getLineFromStack = (stack, index) => stack[index].getLineNumber();
exports.getLineFromStack = getLineFromStack;
const getFileDetails = (index = exports.logSettings.currentConfig.stackIndex) => {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack;
    Error.prepareStackTrace = orig;
    const file = exports.logSettings.currentConfig.hideFile
        ? ''
        : (0, exports.getFileFromStack)(stack, exports.logSettings.currentConfig.stackIndex).slice(process.cwd().length);
    const line = exports.logSettings.currentConfig.hideLine
        ? ''
        : (0, exports.getLineFromStack)(stack, exports.logSettings.currentConfig.stackIndex);
    if (file) {
        if (exports.logSettings.currentConfig.hideLine) {
            return file;
        }
        else {
            return file + ':' + line;
        }
    }
    return '';
};
const defaultLog = (...args) => {
    let s = '';
    if (!exports.logSettings.currentConfig.hideTime) {
        if (exports.logSettings.currentConfig.timeFunction) {
            s += exports.logSettings.currentConfig.timeFunction();
        }
        else if (exports.logSettings.currentConfig.useLocalTime) {
            const offsetMs = new Date().getTimezoneOffset() * 60000;
            let localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
            localISOTime.replace('T', ' ');
            s += localISOTime;
        }
        else {
            s += new Date().toISOString();
        }
    }
    const fileDetails = getFileDetails();
    if (fileDetails) {
        s += ` ${getFileDetails()}`;
    }
    args.forEach((arg) => {
        const fixedArg = typeof arg === 'object' ? JSON.parse((0, objects_1.stringify)(arg)) : arg;
        s += ' ';
        s += typeof fixedArg === 'string' ? fixedArg : (0, objects_1.stringify)(fixedArg);
    });
    console.log(s.trim());
};
const defaultLogger = function (config) {
    return {
        trace: (...args) => {
            if (exports.validLogLevels.indexOf(exports.logSettings.currentConfig.level) >= traceIndex) {
                defaultLog(...args);
            }
        },
        debug: (...args) => {
            if (exports.validLogLevels.indexOf(exports.logSettings.currentConfig.level) >= debugIndex) {
                defaultLog(...args);
            }
        },
        info: (...args) => {
            if (exports.validLogLevels.indexOf(exports.logSettings.currentConfig.level) >= infoIndex) {
                defaultLog(...args);
            }
        },
        warn: (...args) => {
            if (exports.validLogLevels.indexOf(exports.logSettings.currentConfig.level) >= warnIndex) {
                defaultLog(...args);
            }
        },
        error: (...args) => {
            if (exports.validLogLevels.indexOf(exports.logSettings.currentConfig.level) >= errorIndex) {
                defaultLog(...args);
            }
        },
    };
};
const createLogger = (config = {}) => {
    const { pino } = config, restConfig = __rest(config, ["pino"]);
    exports.logSettings.currentConfig = Object.assign({}, exports.logSettings.currentConfig, restConfig);
    loggerUpdater = pino !== null && pino !== void 0 ? pino : defaultLogger;
    exports.logSettings.logger = loggerUpdater(config);
    exports.logSettings.logger.update = (config) => {
        const { pino } = config, restConfig = __rest(config, ["pino"]);
        exports.logSettings.logger = loggerUpdater(restConfig);
    };
    if (!pino) {
        return Object.assign({}, exports.logSettings.logger);
    }
    return {
        trace: (...args) => exports.logSettings.logger.trace(getFileDetails(), ...args),
        debug: (...args) => exports.logSettings.logger.debug(getFileDetails(), ...args),
        info: (...args) => exports.logSettings.logger.info(getFileDetails(), ...args),
        warn: (...args) => exports.logSettings.logger.warn(getFileDetails(), ...args),
        error: (...args) => exports.logSettings.logger.error(getFileDetails(), ...args),
        update: exports.logSettings.logger.update,
    };
};
exports.createLogger = createLogger;
