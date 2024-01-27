import { stringify } from './objects';

export const getFileFromStack = (stack) => stack[0].getFileName();
export const getLineFromStack = (stack) => stack[0].getLineNumber();

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

    let s = '';
    const file = config.hidefile ? '' : getFileFromStack(stack).slice(process.cwd().length);
    if (file) {
      args.unshift(file + ':' + getLineFromStack(stack));
    }
    if (!config.hidetime) {
      args.unshift(new Date().toISOString());
    }
    args.forEach((arg) => {
      const fixedArg = typeof arg === 'object' ? JSON.parse(stringify(arg)) : arg;
      s += typeof fixedArg === 'string' ? fixedArg : stringify(fixedArg);
      s += ' ';
    });

    console.log(s && s.trim());
  };
