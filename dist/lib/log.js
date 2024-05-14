"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.getLineFromStack = exports.getFileFromStack = void 0;
const objects_1 = require("./objects");
const getFileFromStack = (stack, index) => stack[index].getFileName();
exports.getFileFromStack = getFileFromStack;
const getLineFromStack = (stack, index) => stack[index].getLineNumber();
exports.getLineFromStack = getLineFromStack;
// log the filename, line number, and auto stringify objects
const log = (config = {
    hideFile: false,
    hideTime: false,
    hideLine: false,
    useLocalTime: true,
    stackIndex: 1,
}) => (...args) => {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack;
    Error.prepareStackTrace = orig;
    let s = '';
    const file = config.hideFile
        ? ''
        : (0, exports.getFileFromStack)(stack, config.stackIndex).slice(process.cwd().length);
    if (file) {
        if (config.hideLine) {
            args.unshift(file);
        }
        else {
            args.unshift(file + ':' + (0, exports.getLineFromStack)(stack, config.stackIndex));
        }
    }
    if (!config.hideTime) {
        if (config.timeFunction) {
            args.unshift(config.timeFunction());
        }
        else if (config.useLocalTime) {
            const offsetMs = new Date().getTimezoneOffset() * 60000;
            let localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
            localISOTime.replace('T', ' ');
            args.unshift(localISOTime);
        }
        else {
            args.unshift(new Date().toISOString());
        }
    }
    args.forEach((arg) => {
        const fixedArg = typeof arg === 'object' ? JSON.parse((0, objects_1.stringify)(arg)) : arg;
        s += typeof fixedArg === 'string' ? fixedArg : (0, objects_1.stringify)(fixedArg);
        s += ' ';
    });
    console.log(s && s.trim());
};
exports.log = log;
