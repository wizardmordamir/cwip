import { stringify, withoutKeys } from './objects';

export const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error'];
const traceIndex = validLogLevels.indexOf('trace');
const debugIndex = validLogLevels.indexOf('debug');
const infoIndex = validLogLevels.indexOf('info');
const warnIndex = validLogLevels.indexOf('warn');
const errorIndex = validLogLevels.indexOf('error');

export type LoggerConfig = {
  pino?: any;
  name?: string;
  prettyPrint?: { colorize?: boolean; translateTime?: string; ignore?: string };
  hideFile?: boolean;
  hideTime?: boolean;
  hideLine?: boolean;
  useLocalTime?: boolean;
  timeFunction?: Function;
  stackIndex?: number;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
};

let currentConfig: LoggerConfig = {
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

export type LogSettingsType = {
  logger: any;
  currentConfig: LoggerConfig;
  depth: Function | undefined;
};

export const logSettings: LogSettingsType = { logger: null, currentConfig, depth: console.log };

let loggerUpdater;

export const getFileFromStack = (stack, index) => stack[index]?.getFileName() || '';
export const getLineFromStack = (stack, index) => stack[index]?.getLineNumber() || '';

const getFileDetails = (index = logSettings.currentConfig.stackIndex) => {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  const err = new Error();
  Error.captureStackTrace(err);
  const stack = err.stack;
  Error.prepareStackTrace = orig;

  const file = logSettings.currentConfig.hideFile
    ? ''
    : getFileFromStack(stack, index).slice(process.cwd().length);
  const line = logSettings.currentConfig.hideLine ? '' : getLineFromStack(stack, index);
  if (file) {
    if (logSettings.currentConfig.hideLine) {
      return file;
    } else {
      return file + ':' + line;
    }
  }
  return '';
};

const defaultLog = (...args) => {
  let s = '';
  if (!logSettings.currentConfig.hideTime) {
    if (logSettings.currentConfig.timeFunction) {
      s += logSettings.currentConfig.timeFunction();
    } else if (logSettings.currentConfig.useLocalTime) {
      const offsetMs = new Date().getTimezoneOffset() * 60000;
      let localISOTime = new Date(Date.now() - offsetMs).toISOString().slice(0, -1);
      localISOTime.replace('T', ' ');
      s += localISOTime;
    } else {
      s += new Date().toISOString();
    }
  }
  const fileDetails = getFileDetails();
  if (fileDetails) {
    s += ` ${getFileDetails()}`;
  }
  args.forEach((arg) => {
    const fixedArg = typeof arg === 'object' ? JSON.parse(stringify(arg)) : arg;
    s += ' ';
    s += typeof fixedArg === 'string' ? fixedArg : stringify(fixedArg);
  });

  console.log(s.trim());
};

const defaultLogger = function () {
  return {
    trace: (...args) => {
      if (validLogLevels.indexOf(logSettings.currentConfig.level) >= traceIndex) {
        defaultLog(...args);
      }
    },
    debug: (...args) => {
      if (validLogLevels.indexOf(logSettings.currentConfig.level) >= debugIndex) {
        defaultLog(...args);
      }
    },
    info: (...args) => {
      if (validLogLevels.indexOf(logSettings.currentConfig.level) >= infoIndex) {
        defaultLog(...args);
      }
    },
    warn: (...args) => {
      if (validLogLevels.indexOf(logSettings.currentConfig.level) >= warnIndex) {
        defaultLog(...args);
      }
    },
    error: (...args) => {
      if (validLogLevels.indexOf(logSettings.currentConfig.level) >= errorIndex) {
        defaultLog(...args);
      }
    },
  };
};

export const createLogger = (config: LoggerConfig = {}) => {
  const { pino, ...restConfig } = config;
  logSettings.currentConfig = Object.assign({}, logSettings.currentConfig, restConfig);

  loggerUpdater = pino ?? defaultLogger;
  logSettings.logger = loggerUpdater(config);

  logSettings.logger.update = (config: LoggerConfig) => {
    const restConfig = withoutKeys(config, ['pino']);
    logSettings.logger = loggerUpdater(restConfig);
  };

  if (!pino) {
    return { ...logSettings.logger };
  }

  const fns: Record<string, Function> = {
    trace: (...args) => logSettings.logger.trace(getFileDetails(), ...args),
    debug: (...args) => logSettings.logger.debug(getFileDetails(), ...args),
    info: (...args) => logSettings.logger.info(getFileDetails(), ...args),
    warn: (...args) => logSettings.logger.warn(getFileDetails(), ...args),
    error: (...args) => logSettings.logger.error(getFileDetails(), ...args),
    update: logSettings.logger.update,
  };

  fns.depth = (depth, type, ...args) =>
    logSettings.logger[type](
      getFileDetails(depth || logSettings.currentConfig.stackIndex + 1),
      ...args,
    );

  logSettings.logger.depth = fns.depth;
  logSettings.depth = fns.depth;

  return fns;
};
