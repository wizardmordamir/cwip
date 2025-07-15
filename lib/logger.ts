export type LoggerLevel = 'info' | 'debug' | 'trace' | 'warn' | 'error';

export type LoggerConfig = {
  baseDirectory?: string;
  level: LoggerLevel;
  stackDepth: number;
  timestampFunction?: () => string;
};

const validLevels: LoggerLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];

const loggerConfig: LoggerConfig = {
  level: 'info' as LoggerLevel,
  stackDepth: 2, // stack order: [0: getFileDetails, 1: log, 2: logger, 3: callee]
};

export const updateLoggerConfig = (config: Partial<LoggerConfig>) =>
  Object.assign(loggerConfig, config);

export const getFileDetails = (stackDepth?: number) => {
  const stackTraceArray = new Error().stack?.split('\n').slice(1) || [];
  const stackSection =
    stackTraceArray[Math.min(stackDepth || loggerConfig.stackDepth, stackTraceArray.length - 1)] ||
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

const colors = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[34m', // blue
  debug: '\x1b[36m', // cyan
  trace: '\x1b[90m', // gray
};

const makeDefaultTimeStamp = () => new Date().toISOString().replace('T', ' ').replace('Z', '');
const padWith = (length: number) => (padChar: string, str: string) =>
  str.length < length ? padChar.repeat(length - str.length) : ' ';
const padWithMaxLevelLength = padWith(Math.max(...validLevels.map((level) => level.length)) + 1);

const log =
  (level: LoggerLevel) =>
  (...args: any) => {
    if (validLevels.indexOf(level) >= validLevels.indexOf(loggerConfig.level)) {
      const timestamp = loggerConfig.timestampFunction
        ? loggerConfig.timestampFunction()
        : makeDefaultTimeStamp();
      console.log(
        `${colors[level]}[${level.toUpperCase()}]\x1b[0m${padWithMaxLevelLength(' ', level)}${timestamp} ${getFileDetails()} ${args.join(' ')}`,
      );
    }
  };

export const logger = {
  trace: log('trace'),
  debug: log('debug'),
  info: log('info'),
  error: log('error'),
  warn: log('warn'),
};
