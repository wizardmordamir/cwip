import { extend, shallowClone, stringify } from './objects';
import { now } from './times';

export const getFileFromStack = (stack) => stack[0].getFileName();
export const getLineFromStack = (stack) => stack[0].getLineNumber();
export const getFunctionFromStack = (stack) => stack[0].getFunctionName();

// log the filename, line number, function name, and auto stringify objects
export const log =
  (config = {}) =>
  (...args) => {
    // Get the current stack using V8 api (https://v8.dev/docs/stack-trace-api)
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack;
    Error.prepareStackTrace = orig;

    let s = '\n';
    if (!config.hidefunction) {
      args.unshift(getFunctionFromStack(stack) || '');
    }
    if (!config.hideline) {
      args.unshift(':' + getLineFromStack(stack) + ' ');
    }
    if (!config.hidefile) {
      const file = getFileFromStack(stack);
      const trimFile = file.slice(process.cwd().length);
      args.unshift(trimFile);
    }
    if (!config.hidetime) {
      args.unshift(now() + ' ');
    }

    args.forEach((arg) => {
      const fixedArg = typeof arg === 'object' ? JSON.parse(stringify(arg)) : arg;
      const add = typeof fixedArg === 'string' ? fixedArg : stringify(fixedArg);
      s += add;
    });
    console.log(s);
  };
