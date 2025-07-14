"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.getFileDetails = exports.updateLoggerConfig = void 0;
const validLevels = ['trace', 'debug', 'info', 'warn', 'error'];
const envLoggerLevel = process.env.LOGGER_LEVEL;
const baseLoggerLevel = validLevels.includes(envLoggerLevel)
    ? envLoggerLevel
    : 'info';
const loggerConfig = {
    baseDirectory: process.env.LOGGER_BASE_DIRECTORY,
    level: baseLoggerLevel,
    stackDepth: process.env.LOGGER_STACK_DEPTH ? Number(process.env.LOGGER_STACK_DEPTH) : 2, // stack order: [0: getFileDetails, 1: log, 2: logger, 3: callee]
};
const updateLoggerConfig = (config) => Object.assign(loggerConfig, config);
exports.updateLoggerConfig = updateLoggerConfig;
const getFileDetails = (stackDepth) => {
    var _a;
    const stackTraceArray = ((_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(1)) || [];
    const stackSection = stackTraceArray[Math.min(stackDepth || loggerConfig.stackDepth, stackTraceArray.length - 1)] ||
        '';
    const stackMatch = stackSection.match(/at (.+)\)/);
    if (!stackMatch || stackMatch.length < 1) {
        return '/<unknown>';
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
const log = (level) => (...args) => {
    if (validLevels.indexOf(level) >= validLevels.indexOf(loggerConfig.level)) {
        const timestamp = loggerConfig.timestampFunction
            ? loggerConfig.timestampFunction()
            : makeDefaultTimeStamp();
        console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m${padWithMaxLevelLength(' ', level)}${timestamp} ${(0, exports.getFileDetails)()} ${args.join(' ')}`);
    }
};
exports.logger = {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    error: log('error'),
    warn: log('warn'),
};
