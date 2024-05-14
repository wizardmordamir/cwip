"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.getLineFromStack = exports.getFileFromStack = void 0;
const objects_1 = require("./objects");
const getFileFromStack = (stack) => stack[0].getFileName();
exports.getFileFromStack = getFileFromStack;
const getLineFromStack = (stack) => stack[0].getLineNumber();
exports.getLineFromStack = getLineFromStack;
// log the filename, line number, and auto stringify objects
const log = (config = { hideFile: false, hideTime: false, useLocalTime: true }) => (...args) => {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack;
    Error.prepareStackTrace = orig;
    let s = '';
    const file = config.hideFile ? '' : (0, exports.getFileFromStack)(stack).slice(process.cwd().length);
    if (file) {
        args.unshift(file + ':' + (0, exports.getLineFromStack)(stack));
    }
    if (!config.hideTime) {
        if (config.useLocalTime) {
            const offsetMs = new Date().getTimezoneOffset() * 60000;
            const localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
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
