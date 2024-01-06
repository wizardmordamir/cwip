import { extend, shallowClone, stringify } from './objects';
import { now } from './times';

exports.l = console.log;

// log the filename, line number, function name, and auto stringify objects
export const log = (config) => {
  const cwipConfig = (config && config.cwip) || {};
  return function () {
    const localConfig = shallowClone(cwipConfig);
    // Get the current stack using V8 api (https://github.com/v8/v8/wiki/Stack%20Trace%20API)
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    const stack = err.stack;
    Error.prepareStackTrace = orig;

    let s = '\n';
    const args = [...arguments];
    // check if the first arg is a configuration object
    if (typeof args[0] === 'object' && !args[0].cwip === undefined) {
      extend(localConfig, args[0].cwip);
      args.shift();
    }
    if (!localConfig.hidefunction) {
      args.unshift(fn());
    }
    if (!localConfig.hideline) {
      args.unshift(line());
    }
    if (!localConfig.hidefile) {
      args.unshift(file());
    }
    if (!localConfig.hidetime) {
      args.unshift(now());
    }
    args.forEach((arg) => {
      const fixedArg = typeof arg === 'object' ? JSON.parse(stringify(arg)) : arg;
      const add = typeof fixedArg === 'string' ? fixedArg : stringify(fixedArg);
      s += add + '\n';
    });
    console.log(s);
    // Get the name of the current file
    function file() {
      return 'FILE:\t' + stack[0].getFileName();
    }
    // Get the current line number
    function line() {
      return 'LINE:\t' + stack[0].getLineNumber();
    }
    // get the current function name
    function fn() {
      return 'FUNC:\t' + stack[0].getFunctionName() + ' ()';
    }
    if (localConfig.nightwatch) {
      this.pause(1);
      return this;
    }
  };
};
