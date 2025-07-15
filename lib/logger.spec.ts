/* eslint-disable */
import { logger, LoggerConfig, updateLoggerConfig } from './logger';

const getConsoleSpy = () => jest.spyOn(console, 'log');

const escapeForRegex = (str) => {
  if (!/[.*+?^${}()|[\]\\]/.test(str)) {
    return str;
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const loggerConfig: LoggerConfig = {
  level: 'info',
  stackDepth: 2, // stack order: [0: getFileDetails, 1: log, 2: logger, 3: callee]
};

describe('logger', () => {
  const mockISOString = 'mock-01-01T01:01:01.001Z';
  const mockISOStringParsed = 'mock-01-01 01:01:01.001';

  afterEach(() => {
    jest.restoreAllMocks();
    updateLoggerConfig(loggerConfig);
  });

  it('should log info', async () => {
    const nowSpy = jest.spyOn(global, 'Date').mockImplementation(() => ({
      toISOString: () => mockISOString,
      getTimezoneOffset: () => 60000,
    }));

    global.Date.now = () => 0;

    const consoleSpy = getConsoleSpy();

    logger.error('test');

    expect(nowSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    const consoleSpyCalledWith = consoleSpy.mock.calls[0].join(' ');

    const consoleSpyRegex = new RegExp(
      `\\[ERROR\\].+${escapeForRegex(mockISOStringParsed)} /lib/logger.spec.ts:[0-9]{1,4} test`,
    );

    expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
      consoleSpyCalledWith,
      true,
    ]);
  });

  it('should log info with config with time', async () => {
    const nowSpy = jest.spyOn(global, 'Date').mockImplementation(() => ({
      toISOString: () => mockISOString,
      getTimezoneOffset: () => 60000,
    }));
    global.Date.now = () => 0;
    const consoleSpy = getConsoleSpy();
    const data = 'a'; //JSON.stringify({a: 'b'});
    logger.info('test', data);
    expect(nowSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const consoleSpyRegex = new RegExp(`\\[INFO\\].+${escapeForRegex(mockISOStringParsed)}`);

    const consoleSpyCalledWith = consoleSpy.mock.calls[0].join(' ');
    expect([
      consoleSpyCalledWith,
      consoleSpyRegex,
      consoleSpyRegex.test(consoleSpyCalledWith),
    ]).toEqual([consoleSpyCalledWith, consoleSpyRegex, true]);
  });

  it('should log info with config with custom time', async () => {
    const consoleSpy = getConsoleSpy();
    const mockTime = 'custom';
    updateLoggerConfig({ timestampFunction: () => mockTime });
    const data = 'abc';
    logger.info('test', data);
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    const consoleSpyRegex = new RegExp(
      `${escapeForRegex('[INFO]')}.+${escapeForRegex(mockTime)}.+test ${escapeForRegex(data)}`,
    );
    const consoleSpyCalledWith = consoleSpy.mock.calls[0].join(' ');
    expect([
      consoleSpyCalledWith,
      escapeForRegex(mockTime),
      consoleSpyRegex,
      consoleSpyRegex.test(consoleSpyCalledWith),
    ]).toEqual([consoleSpyCalledWith, escapeForRegex(mockTime), consoleSpyRegex, true]);
  });

  it('should automatically stringify objects instead of [object Object]', () => {
    const consoleSpy = getConsoleSpy();

    const mockObj = {
      nest: {
        some: {
          data: [1, 2, 3],
        },
      },
    };

    const err = new Error('mock error');
    logger.error('test', mockObj, 'error: ', err, ', after error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);

    const consoleSpyCalledWith = consoleSpy.mock.calls[0].join(' ');

    const consoleSpyRegex = new RegExp(`mock error`);
    const consoleSpyObjectRegex = new RegExp('object Object');

    expect([
      consoleSpyCalledWith,
      consoleSpyRegex.test(consoleSpyCalledWith),
      consoleSpyObjectRegex.test(consoleSpyCalledWith),
    ]).toEqual([consoleSpyCalledWith, true, false]);
  });
});
