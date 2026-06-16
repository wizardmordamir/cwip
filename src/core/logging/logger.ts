import { getMessageFromError } from '../object';
import { safeStringify } from '../object/safeStringify';

export type LoggerLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off';

export type LoggerConfig = {
  baseDirectory?: string;
  level: LoggerLevel;
  skipStringify?: boolean;
  /**
   * Extra wrapper frames to skip when resolving the caller's file/line.
   * 0 = the code that called the logger directly. Bump to 1+ when a helper
   * library wraps the logger (e.g. `const log = (...a) => logger.info(...a)`),
   * so file paths still point past the wrapper. Replaces the old absolute
   * `stackDepth` magic number, which is now auto-detected.
   */
  stackOffset: number;
  stringifyError?: (_error: Error) => string;
  stringifyObject?: (_arg: any) => string;
  timestampFunction?: () => string;
  toggles: {
    // Made non-optional to simplify logic
    skipFileDetails: boolean;
    skipTimestamps: boolean;
  };
};

export type Logger = {
  trace: (..._args: any[]) => void;
  debug: (..._args: any[]) => void;
  info: (..._args: any[]) => void;
  warn: (..._args: any[]) => void;
  error: (..._args: any[]) => void;
  /** A new logger that inherits this one's config, with overrides applied. */
  child: (_overrides?: Partial<LoggerConfig>) => Logger;
  getConfig: () => string;
  updateConfig: (_config: Partial<LoggerConfig>) => LoggerConfig;
};

const validLevels: LoggerLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'off'];
const levelPriority = validLevels.reduce(
  (acc, lvl, i) => {
    acc[lvl] = i;
    return acc;
  },
  {} as Record<LoggerLevel, number>,
);

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[34m',
  debug: '\x1b[36m',
  trace: '\x1b[90m',
};

const makeDefaultConfig = (): LoggerConfig => ({
  level: 'info',
  stackOffset: 0,
  toggles: {
    skipFileDetails: false,
    skipTimestamps: false,
  },
});

const buildConfig = (config: Partial<LoggerConfig> = {}): LoggerConfig => {
  const base = makeDefaultConfig();
  return {
    ...base,
    ...config,
    toggles: { ...base.toggles, ...config.toggles },
  };
};

// Node/Bun expose process.cwd(); browsers do not. Guard so the browser path
// never references `process`.
const isNodeLike = typeof process !== 'undefined' && typeof process.cwd === 'function';

// The file this module lives in. Captured once from the stack so it matches the
// exact format the runtime reports for other frames (file:// URL vs plain path).
let selfFile: string | undefined;

const resolveBaseDirectory = (config: LoggerConfig): string | undefined => {
  if (config.baseDirectory) return config.baseDirectory;
  if (isNodeLike) return process.cwd();
  return undefined;
};

const cleanPath = (fullPath: string, config: LoggerConfig): string => {
  const base = resolveBaseDirectory(config);

  if (base) {
    // Deterministic: strip the base as an absolute path prefix.
    if (fullPath.startsWith(base)) {
      const rest = fullPath.slice(base.length);
      return rest.startsWith('/') ? rest : `/${rest}`;
    }
    // Fallback: treat the base's last segment as a name to slice after
    // (handles a name-only base, or a file living under node_modules).
    const pieces = fullPath.split('/');
    const segment = base.split('/').pop() || base;
    const idx = pieces.indexOf(segment);
    if (idx !== -1) return `/${pieces.slice(idx + 1).join('/')}`;
  }

  // Last resort (e.g. browser with no base supplied): show the last two segments.
  const pieces = fullPath.split('/');
  return `/${pieces.slice(-2).join('/')}`;
};

const getFileDetailsFor = (config: LoggerConfig, extraOffset = 0): string => {
  if (config.toggles.skipFileDetails) return '';

  const originalPrepare = Error.prepareStackTrace;
  // Temporary override to get structured data
  Error.prepareStackTrace = (_, stack) => stack;

  const err = new Error();
  const stack = (err.stack as unknown as any[]) || [];
  Error.prepareStackTrace = originalPrepare; // Restore immediately

  if (!stack.length) return '';

  if (selfFile === undefined) selfFile = stack[0]?.getFileName?.() ?? '';

  // Skip every frame inside this module (getFileDetailsFor, the log closure, the
  // level method...), then skip any caller-supplied wrapper frames. This removes
  // the brittle hardcoded depth: it doesn't matter how many internal frames there
  // are, the first external frame is the real caller.
  let i = 0;
  while (i < stack.length && stack[i]?.getFileName?.() === selfFile) i++;
  i += config.stackOffset + extraOffset;

  const frame = stack[i];
  if (!frame) return '';

  const fullPath = frame.getFileName?.() || '';
  const lineNumber = frame.getLineNumber?.();

  return `${cleanPath(fullPath, config)}:${lineNumber}`;
};

const makeDefaultTimeStamp = () => new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

const stringifyArgs = (args: any[], config: LoggerConfig) => {
  if (config.skipStringify) return args;
  return args.map((arg) => {
    if (arg instanceof Error) return config.stringifyError?.(arg) ?? getMessageFromError(arg);
    if (typeof arg === 'object' && arg !== null) return config.stringifyObject?.(arg) ?? safeStringify(arg);
    return String(arg);
  });
};

const makeLog =
  (config: LoggerConfig, level: Exclude<LoggerLevel, 'off'>) =>
  (...args: any[]) => {
    // Priority check: only log if level is high enough
    if (levelPriority[level] < levelPriority[config.level]) return;

    const prefix = `${colors[level]}[${level.toUpperCase()}]\x1b[0m`.padEnd(15);
    const timestamp = config.toggles.skipTimestamps ? '' : (config.timestampFunction?.() ?? makeDefaultTimeStamp());
    const details = getFileDetailsFor(config);

    const message = stringifyArgs(args, config).join(' ');
    const header = `${prefix}${timestamp} ${details}`.trim();

    // Dynamically call console.error, console.warn, etc.
    const consoleMethod = level === 'trace' ? 'debug' : level;
    globalThis.console[consoleMethod](header, message);
  };

const loggerFromConfig = (config: LoggerConfig): Logger => ({
  trace: makeLog(config, 'trace'),
  debug: makeLog(config, 'debug'),
  info: makeLog(config, 'info'),
  warn: makeLog(config, 'warn'),
  error: makeLog(config, 'error'),
  child: (overrides = {}) =>
    loggerFromConfig(
      buildConfig({
        ...config,
        ...overrides,
        toggles: { ...config.toggles, ...overrides.toggles },
      }),
    ),
  getConfig: () => safeStringify(config),
  updateConfig: (update) => {
    if (update.toggles) Object.assign(config.toggles, update.toggles);
    return Object.assign(config, { ...update, toggles: config.toggles });
  },
});

/**
 * Create an independent logger instance with its own config. Pass the instance
 * around (dependency injection) when multiple packages must share one logger
 * regardless of how node_modules deduped cwip.
 */
export const createLogger = (config: Partial<LoggerConfig> = {}): Logger => loggerFromConfig(buildConfig(config));

// --- Default instance + back-compat surface ---------------------------------
// A shared config object the default instance and the legacy module-level
// functions both mutate, so existing `updateLoggerConfig(...)` callers still work.
const defaultConfig = buildConfig();
export const logger = loggerFromConfig(defaultConfig);

export const getLoggerConfig = () => safeStringify(defaultConfig);
export const updateLoggerConfig = (config: Partial<LoggerConfig>) => {
  if (config.toggles) Object.assign(defaultConfig.toggles, config.toggles);
  return Object.assign(defaultConfig, { ...config, toggles: defaultConfig.toggles });
};
export const updateLoggerLevel = (level: LoggerLevel) => {
  return Object.assign(defaultConfig, { level });
};

/** Back-compat standalone helper, bound to the default logger's config. */
export const getFileDetails = (stackOffset = 0) => getFileDetailsFor(defaultConfig, stackOffset);
