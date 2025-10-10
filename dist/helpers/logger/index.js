"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.getFileDetails = exports.updateLoggerConfig = void 0;
const objects_1 = require("../../objects");
const safeStringify_1 = require("../safeStringify");
const validLevels = ['trace', 'debug', 'info', 'warn', 'error'];
const loggerConfig = {
    level: 'info',
    stackDepth: 2, // stack order: [0: getFileDetails, 1: log, 2: logger, 3: callee]
};
const updateLoggerConfig = (config) => Object.assign(loggerConfig, config);
exports.updateLoggerConfig = updateLoggerConfig;
const getFileDetails = (stackDepth) => {
    const stackTraceArray = new Error().stack?.split('\n').slice(1) || [];
    const stackSection = stackTraceArray[Math.min(stackDepth || loggerConfig.stackDepth, stackTraceArray.length - 1)] ||
        '';
    const stackMatch = stackSection.match(/at (.+)(?:\))?/);
    if (!stackMatch || stackMatch.length < 1) {
        return '';
    }
    const [filePath, line] = stackMatch[1].split(':');
    const pieces = filePath.split('/');
    const sliceIndex = pieces.indexOf(loggerConfig.baseDirectory);
    const file = sliceIndex !== -1 ? pieces.slice(sliceIndex + 1) : pieces.slice(-2);
    return `/${file.join('/')}:${line}`;
};
exports.getFileDetails = getFileDetails;
const colors = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m', // yellow
    info: '\x1b[34m', // blue
    debug: '\x1b[36m', // cyan
    trace: '\x1b[90m', // gray
};
const makeDefaultTimeStamp = () => new Date().toISOString().replace('T', ' ').replace('Z', '');
const padWith = (length) => (padChar, str) => str.length < length ? padChar.repeat(length - str.length) : ' ';
const padWithMaxLevelLength = padWith(Math.max(...validLevels.map((level) => level.length)) + 1);
const stringifyObjects = (args) => {
    if (loggerConfig.skipStringify) {
        return args;
    }
    const stringifiedArgs = args.map((arg) => {
        try {
            if (arg instanceof Error) {
                if (loggerConfig.stringifyError) {
                    return loggerConfig.stringifyError(arg);
                }
                return (0, objects_1.getMessageFromError)(arg);
            }
            if (typeof arg === 'object' && arg !== null) {
                if (loggerConfig.stringifyObject) {
                    return loggerConfig.stringifyObject(arg);
                }
                return (0, safeStringify_1.safeStringify)(arg);
            }
            return String(arg);
        }
        catch (error) {
            return String(arg);
        }
    });
    return stringifiedArgs;
};
const log = (level) => (...args) => {
    if (validLevels.indexOf(level) >= validLevels.indexOf(loggerConfig.level)) {
        const timestamp = loggerConfig.timestampFunction
            ? loggerConfig.timestampFunction()
            : makeDefaultTimeStamp();
        console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m${padWithMaxLevelLength(' ', level)}${timestamp} ${(0, exports.getFileDetails)()}`, stringifyObjects(args).join(' '));
    }
};
exports.logger = {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    error: log('error'),
    warn: log('warn'),
};
