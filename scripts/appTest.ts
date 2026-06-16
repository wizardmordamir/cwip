import { expect } from 'bun:test';

import {
  add,
  addKey,
  addKeyA,
  allKeysExist,
  alphaNumRegex,
  arrToKeys,
  asciiExtendedRegex,
  assign,
  assocPath,
  bytesInGB,
  bytesInKB,
  bytesInMB,
  bytesInTB,
  callOrReturnIt,
  callWithKeys,
  cleanDataForLogging,
  cleanStringForLogging,
  ComposableObject,
  compose,
  concat,
  containsString,
  containsWhitespace,
  convertBytesTo,
  convertBytesToGB,
  convertBytesToKB,
  convertBytesToMB,
  convertBytesToTB,
  convertEncoding,
  convertGBToBytes,
  convertGBToKB,
  convertGBToMB,
  convertGBToTB,
  convertKBToBytes,
  convertKBToGB,
  convertKBToMB,
  convertKBToTB,
  convertMBToBytes,
  convertMBToGB,
  convertMBToKB,
  convertMBToTB,
  convertScientificToDecimal,
  convertTBToBytes,
  convertTBToGB,
  convertTBToKB,
  convertTBToMB,
  convertToBytes,
  countDecimals,
  createLogger,
  createNamedPipeline,
  createPipeline,
  createRequestPipeline,
  createRequestPipelineContext,
  curry,
  dateFormatRegexes,
  dateToISOString,
  daysPastDate,
  dbConnectionErrors,
  deepClone,
  deepFreeze,
  deepJsonParse,
  defaultNetworkErrorIndicators,
  difference,
  differenceBy,
  divide,
  doMath,
  either,
  eitherA,
  escapeForRegex,
  every,
  everyCurried,
  existy,
  expectOrThrow,
  extend,
  extractDistinctMappings,
  extractKey,
  extractKeyA,
  filter,
  filterA,
  filterCurried,
  find,
  findCurried,
  findKeyMatch,
  finishResponse,
  firstExistingKey,
  firstExistingKeyValue,
  flat,
  formatDate,
  fromBase64,
  GBInKB,
  GBInMB,
  GBInTB,
  getArg,
  getArgAt,
  getArgLast,
  getDateDaysAgo,
  getESTDate,
  getFileDetails,
  getFunctionName,
  getHtmlBody,
  getKey,
  getLocalDate,
  getLoggerConfig,
  getMessageFromError,
  getMissingKeys,
  getTimeFromISO,
  getTimeStringFormat,
  getUTCDate,
  getValue,
  getZonedDate,
  hasAllKeys,
  hasKey,
  hasLength,
  head,
  hoursPastDate,
  identity,
  ifIt,
  ifItA,
  includes,
  includesDeep,
  isASCII,
  isAxiosError,
  isBase64,
  isBoolean,
  isEmpty,
  isEmptyDeep,
  isFunction,
  isNetworkError,
  isNot,
  isNull,
  isNullish,
  isNumber,
  isObject,
  isObjectNotArray,
  isPlainObject,
  isPrimitive,
  isPrintableASCII,
  isRetriableHttpError,
  isRetriableHttpStatus,
  isString,
  isStringBoolean,
  isStringNull,
  isStringNumber,
  isStringOrInstanceString,
  isUndefined,
  KBInGB,
  KBInMB,
  KBInTB,
  last,
  length,
  logger,
  loggingSettings,
  loggit,
  makeErrorJson,
  makeRegexToMatchCharsInStr,
  makeRegexToMatchCharsNotInStr,
  map,
  mapA,
  mapKey,
  markAsCleanup,
  matchToKey,
  MBInGB,
  MBInKB,
  MBInTB,
  mergeObjects,
  mergeObjectsDeep,
  minMaxValue,
  minutesPastDate,
  missingKeys,
  multiply,
  not,
  objHasKey,
  omit,
  orderBy,
  parseDate,
  path,
  pick,
  pipe,
  pipeAsync,
  pluck,
  redactText,
  reduce,
  reduceKeys,
  removeDups,
  removeExtraWhitespace,
  removeFromEnd,
  removeFromEnds,
  removeFromMiddle,
  removeFromStart,
  removeKeysMutate,
  removeModulesFromStack,
  removeSimpleHtmlByTag,
  requestHandlerPipelineCatch,
  requestHandlerPipelineWrapper,
  round,
  roundDown,
  roundUp,
  safeStringify,
  sanitizeString,
  setFunctionName,
  setPrecision,
  setValue,
  shallowClone,
  // ShortCircuit,
  shouldLogMessage,
  showStackForError,
  // sideEffect,
  skipStackErrorCodes,
  sleep,
  some,
  sort,
  splice,
  split,
  StateMonad,
  stringify,
  stringifyUnsafe,
  stringIncludesAny,
  subtract,
  sumBy,
  tail,
  takeKey,
  takeKeyA,
  tap,
  // tapA,
  tapAsync,
  TBInGB,
  TBInKB,
  TBInMB,
  throwIfMissingKeys,
  timePastDate,
  timePastDateExcludeWeekend,
  toBase64,
  trim,
  truthy,
  tryJsonParse,
  tryOr,
  tryOrAsync,
  unique,
  uniqueBy,
  unwrap,
  updateDateFormatRegexes,
  updateLoggerConfig,
  updateLoggingSettings,
  within,
  without,
  wrapInKey,
  wrapPipeAsync,
  zip,
} from '../dist';

import {
  BASE_PATH,
  checkConnection,
  copyFileTask,
  createDirTask,
  createSymlink,
  createSymlinkSafe,
  defaultSettings,
  execAsync,
  fileExists,
  fileNameExists,
  getDirPaths,
  getUniqueId,
  isDir,
  isDirOrSymLink,
  isDirSync,
  isDirUnsafe,
  isExistingPath,
  isSymLink,
  joinPath,
  logAndThrowIfExists,
  logAndThrowIfNotExists,
  lstatSafe,
  makeCorrelationId,
  makeIdFromData,
  makePathStringFromAppRoot,
  randomAlphaNumeric,
  readFile,
  readFileUnsafe,
  removePath,
  writeFile,
} from '../dist/node';

import {
  fake,
  fakeReject,
  initializeGlobalMocks,
  makeMockApp,
  makeMockLogger,
  makeMockReq,
  makeMockRequestLocals,
  makeMockRes,
  makePipelineMockRes,
  makeStreamableMockRes,
  mockMongoDB,
  resetAllMocks,
} from '../dist/testing';

import type {
  ArrayOfObjectKeys,
  BasicMathOperations,
  Cast,
  Concattable,
  ConvertType,
  Curried,
  DateLike,
  DefinedObject,
  Drop,
  ExternalResponse,
  HttpRequest,
  HttpResponse,
  Length,
  Logger,
  LoggerConfig,
  LoggerLevel,
  LoggingSettings,
  MakeErrorJsonOptions,
  Obj,
  ParseOptions,
  PartialDefinedObject,
  Prepend,
  ReducerFnType,
  RequestLocals,
  RequestLocalsAuth,
  RequestPipelineContext,
  SkipParsingFn,
  Tail,
  TimeType,
  TimeZone,
  UpstreamResponse,
} from '../dist';

import type {
  MockResponse,
  StreamableResponse,
} from '../dist/testing';

logger.trace('This is a trace message');
logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.info('Running app test');

isDir('.').then((res) => logger.info('isDirectory result:', res));

isExistingPath('.').then((res) => logger.info('isExistingPath result:', res));

isSymLink('.').then((res) => logger.info('isSymLink result:', res));

let result: any = deepFreeze({ a: 1, b: { c: 2 } });
logger.info('\n******* deepFreeze result:\n', result, '\n');
if (JSON.stringify(result) === '{"a":1,"b":{"c":2}}') {
  logger.info('deepFreeze test passed');
} else {
  logger.error('deepFreeze test failed');
  throw new Error('deepFreeze test failed');
}
let base64 = toBase64('hello world');
logger.info(
  '\n******* base64 of "hello world":\n',
  base64,
  isBase64(base64),
  fromBase64(base64),
  '\n',
);
expect(base64).toBe('aGVsbG8gd29ybGQ=');
expect(isBase64(base64)).toBe(true);
expect(fromBase64(base64)).toBe('hello world');

logger.info('\n******* toBase64("hello world")\n', toBase64('hello world'), '\n');

logger.info('\n******* log: INFO hello\n');
logger.info('hello', '\n');

logger.info('\n******* use logger to log: DEBUG 1, 2, c\n');
logger.debug('1', '2', 'c', '\n');

logger.info('\n******* use logger to log: INFO smartLogger logging\n');
logger.info('logger', 'logging', '\n');

logger.info('\n******* use logger to log: WARN 1, 2, c\n');
logger.warn('1', '2', 'c', '\n');

logger.info('\n******* use logger to log: ERROR 1, 2, c\n');
logger.error('1', '2', 'c', '\n');

const err = new Error('MY ERROR');
logger.error('obj:', { deeply: { nested: { obj: [1, 2, 3] } } }, err);

logger.error('EXPECT THIS ERR:', err);
// logger.info('stats:', stats.loadAvg());

const x = mergeObjectsDeep({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: [{ e1: 4 }] }, { a: 5, f: 6 });
logger.info('mergeObjectsDeep merged object:', x);
expect(
  JSON.stringify(x) === '{"a":5,"b":{"c":2,"d":3},"e":[{"e1":4}],"f":6}').toBe(true);

logger.info("\n safeStringify('hello'):", safeStringify('hello'));
logger.info(
  '\n safeStringify({a:1,b:{c:2}}):',
  safeStringify({ a: 1, b: { c: 2 } }),
);
const obj: any = { a: 1 };
obj.b = obj; // circular reference
logger.info('\n safeStringify(circular obj):', safeStringify(obj));

result = removeExtraWhitespace('  too   much \n whitespace\t was  here  ');
logger.info('\nremoveExtraWhitespace result:', JSON.stringify(result));

const d1 = '2023-10-01T12:00:00Z';
const d2 = '2023-10-02T15:30:00Z';
logger.info('\nUTC Dates:', d1, d2);
logger.info('timePastDate seconds:', timePastDate('milliseconds', d1, d2));
logger.info('timePastDate minutes:', timePastDate('minutes', d1, d2));
logger.info('timePastDate hours:', timePastDate('hours', d1, d2));
logger.info('timePastDate days:', timePastDate('days', d1, d2));
logger.info('timePastDate weeks:', timePastDate('weeks', d1, d2));
logger.info('timePastDate months:', timePastDate('months', d1, d2));
logger.info('timePastDate years:', timePastDate('years', d1, d2));

logger.info(
  '\ncontainsWhiteSpace:',
  containsWhitespace('noSpaces'),
  containsWhitespace('has spaces'),
);

logger.info('throwIfMissingKeys test:', throwIfMissingKeys({ a: 1, b: 2 }, ['a', 'b']));

updateLoggerConfig({ level: 'off' });
logger.error("THIS SHOULDN'T LOG");
updateLoggerConfig({ level: 'trace' });
logger.trace("THIS SHOULD LOG AT TRACE LEVEL, config:", getLoggerConfig());

try {
  const env = {
    helo: 'hi',
    world: 'earth',
    foo: 'bar',
  };

  const run = (fn, val) => {
    fn(val);
  };
  run(ifIt(truthy, loggit('msg3:')), env);
  ['hello', 'world'].filter(objHasKey(env)).forEach(loggit('msg:'));
  pipe((v) => {
    logger.info(v);
    return v;
  }, loggit('msg1:'))('hi');
} catch (err) {
  logger.error(err);
}

// --- New logger creation + per-instance functionality -----------------------

// createLogger: an independent instance with its own config (DI-friendly).
const appLogger: Logger = createLogger({
  level: 'debug',
  baseDirectory: 'cwip',
  toggles: { skipFileDetails: false, skipTimestamps: false },
});
appLogger.debug('createLogger: debug visible at level "debug"');
appLogger.info('createLogger: info message', { ok: true });

// Build an instance from a typed Partial<LoggerConfig>.
const loggerOptions: Partial<LoggerConfig> = { level: 'trace', stackOffset: 0 };
const optLogger = createLogger(loggerOptions);
optLogger.trace('optLogger: created from a typed Partial<LoggerConfig>');

// child(): inherits parent config, applies overrides (e.g. skip a wrapper frame).
const requestLogger = appLogger.child({ stackOffset: 1 });
requestLogger.info('child logger: inherits parent config with overrides');

// updateConfig(): per-instance mutation; the level gate then suppresses debug.
appLogger.updateConfig({ level: 'warn' });
appLogger.debug('suppressed: appLogger level raised to "warn"');
appLogger.warn('createLogger: warn still visible after updateConfig');

// getConfig(): serialized snapshot of this instance's config.
const appCfg: string = appLogger.getConfig();
appLogger.warn('appLogger config snapshot:', appCfg);

// Silent instance for perf testing / disabling output (every call no-ops).
const silentLogger = createLogger({ level: 'off' });
silentLogger.error('never printed: level "off" short-circuits every call');

// Custom stringifiers + timestamp + toggles.
const customLogger = createLogger({
  level: 'trace',
  skipStringify: false,
  stringifyObject: (arg) => JSON.stringify(arg),
  stringifyError: (e) => `ERR:${e.message}`,
  timestampFunction: () => 'fixed-timestamp',
  toggles: { skipFileDetails: true, skipTimestamps: false },
});
customLogger.trace('customLogger:', { sample: 'object' }, new Error('sample error'));

// getFileDetails(): stack-derived caller location used in log headers.
const where: string = getFileDetails();
logger.info('getFileDetails ->', where);

// LoggerLevel as a typed value.
const configuredLevel: LoggerLevel = 'info';
logger.info('configured level:', configuredLevel);

process.exit();
