import { stringify } from './objects';

type Config = {
  hideFile: boolean;
  hideTime: boolean;
  useLocalTime: boolean;
};

export const getFileFromStack = (stack) => stack[0].getFileName();
export const getLineFromStack = (stack) => stack[0].getLineNumber();

// log the filename, line number, and auto stringify objects
export const log =
  (config: Config = { hideFile: false, hideTime: false, useLocalTime: true }) =>
  (...args) => {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack;
    Error.prepareStackTrace = orig;

    let s = '';
    const file = config.hideFile ? '' : getFileFromStack(stack).slice(process.cwd().length);
    if (file) {
      args.unshift(file + ':' + getLineFromStack(stack));
    }
    if (!config.hideTime) {
      if (config.useLocalTime) {
        const offsetMs = new Date().getTimezoneOffset() * 60000;
        const localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
        args.unshift(localISOTime);
      } else {
        args.unshift(new Date().toISOString());
      }
    }
    args.forEach((arg) => {
      const fixedArg = typeof arg === 'object' ? JSON.parse(stringify(arg)) : arg;
      s += typeof fixedArg === 'string' ? fixedArg : stringify(fixedArg);
      s += ' ';
    });

    console.log(s && s.trim());
  };
