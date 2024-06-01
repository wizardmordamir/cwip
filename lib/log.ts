import { stringify } from './objects';

export const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error'];
const traceIndex = validLogLevels.indexOf('trace');
const debugIndex = validLogLevels.indexOf('debug');
const infoIndex = validLogLevels.indexOf('info');
const warnIndex = validLogLevels.indexOf('warn');
const errorIndex = validLogLevels.indexOf('error');

type LoggerConfig = {
  pino?: any;
  name?: string;
  prettyPrint?: {
    colorize?: boolean;
    translateTime?: string;
    ignore?: string;
  };
  hideFile?: boolean;
  hideTime?: boolean;
  hideLine?: boolean;
  useLocalTime?: boolean;
  timeFunction?: Function;
  stackIndex?: number;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
};

let loggerUpdater;
let logger;

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

export const getFileFromStack = (stack, index) => stack[index].getFileName();
export const getLineFromStack = (stack, index) => stack[index].getLineNumber();

const getFileDetails = (index = currentConfig.stackIndex) => {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  const err = new Error();
  Error.captureStackTrace(err);
  const stack = err.stack;
  Error.prepareStackTrace = orig;

  const file = currentConfig.hideFile
    ? ''
    : getFileFromStack(stack, currentConfig.stackIndex).slice(process.cwd().length);
  const line = currentConfig.hideLine ? '' : getLineFromStack(stack, currentConfig.stackIndex);
  if (file) {
    if (currentConfig.hideLine) {
      return file;
    } else {
      return file + ':' + line;
    }
  }
  return '';
};

const defaultLog = (...args) => {
  let s = '';
  if (!currentConfig.hideTime) {
    if (currentConfig.timeFunction) {
      s += currentConfig.timeFunction();
    } else if (currentConfig.useLocalTime) {
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

const defaultLogger = function (config) {
  return {
    trace: (...args) => {
      if (validLogLevels.indexOf(currentConfig.level) >= traceIndex) {
        defaultLog(...args);
      }
    },
    debug: (...args) => {
      if (validLogLevels.indexOf(currentConfig.level) >= debugIndex) {
        defaultLog(...args);
      }
    },
    info: (...args) => {
      if (validLogLevels.indexOf(currentConfig.level) >= infoIndex) {
        defaultLog(...args);
      }
    },
    warn: (...args) => {
      if (validLogLevels.indexOf(currentConfig.level) >= warnIndex) {
        defaultLog(...args);
      }
    },
    error: (...args) => {
      if (validLogLevels.indexOf(currentConfig.level) >= errorIndex) {
        defaultLog(...args);
      }
    },
  };
};

export const createLogger = (config: LoggerConfig = {}) => {
  const { pino, ...restConfig } = config;
  currentConfig = Object.assign({}, currentConfig, restConfig);

  loggerUpdater = pino ?? defaultLogger;
  logger = loggerUpdater(config);

  logger.update = (config: LoggerConfig) => {
    const { pino, ...restConfig } = config;
    console.log('****** restconfig:', JSON.stringify(restConfig));
    logger = loggerUpdater(restConfig);
  };

  if (!pino) {
    return {
      ...logger,
    };
  }

  return {
    trace: (...args) => logger.trace(getFileDetails(), ...args),
    debug: (...args) => logger.debug(getFileDetails(), ...args),
    info: (...args) => logger.info(getFileDetails(), ...args),
    warn: (...args) => logger.warn(getFileDetails(), ...args),
    error: (...args) => logger.error(getFileDetails(), ...args),
    update: logger.update,
  };
};
