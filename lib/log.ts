import { stringify } from './objects';

type Config = {
  hideFile?: boolean;
  hideTime?: boolean;
  hideLine?: boolean;
  useLocalTime?: boolean;
  timeFunction?: Function;
  stackIndex?: number;
};

export const getFileFromStack = (stack, index) => stack[index].getFileName();
export const getLineFromStack = (stack, index) => stack[index].getLineNumber();

// log the filename, line number, and auto stringify objects
export const log =
  (
    config: Config = {
      hideFile: false,
      hideTime: false,
      hideLine: false,
      useLocalTime: true,
      stackIndex: 1,
    },
  ) =>
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
    const file = config.hideFile
      ? ''
      : getFileFromStack(stack, config.stackIndex).slice(process.cwd().length);
    if (file) {
      if (config.hideLine) {
        args.unshift(file);
      } else {
        args.unshift(file + ':' + getLineFromStack(stack, config.stackIndex));
      }
    }
    if (!config.hideTime) {
      if (config.timeFunction) {
        args.unshift(config.timeFunction());
      } else if (config.useLocalTime) {
        const offsetMs = new Date().getTimezoneOffset() * 60000;
        let localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
        localISOTime.replace('T', ' ');
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
