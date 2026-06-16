import { initializeGlobalMocks, resetAllMocks } from '../../ops/testing/registry';

const mockManager = initializeGlobalMocks();

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { getLoggerConfig, logger, updateLoggerConfig, updateLoggerLevel } from '.';

describe('logger', () => {
  const mockISOString = 'mock-01-01T01:01:01.001Z';
  const mockISOStringParsed = 'mock-01-01 01:01:01';

  beforeEach(() => {
    resetAllMocks();
    // Reset Date to real one before each test if you mess with it
  });

  it('should log if level is debug', () => {
    updateLoggerLevel('debug');
    logger.debug('test');

    // debug (and trace) route to console.debug, not console.info
    expect(mockManager.registry.console.debug).toHaveBeenCalledTimes(1);
  });

  it('should not log if level is off', () => {
    updateLoggerLevel('off');
    logger.info('test');

    // Check call count via registry
    expect(mockManager.registry.console.info).toHaveBeenCalledTimes(0);
  });

  it('should not log if level is off', () => {
    updateLoggerConfig({ level: 'off' });
    logger.info('test');

    // Check call count via registry
    expect(mockManager.registry.console.info).toHaveBeenCalledTimes(0);
  });

  it('should log error with correct format', () => {
    updateLoggerConfig({ level: 'error' });
    // 1. Mock Date globally for this test
    const originalDate = global.Date;
    global.Date = mock(() => ({
      toISOString: () => mockISOString,
      getTimezoneOffset: () => 60000,
    })) as any;

    logger.error('test');

    expect(mockManager.registry.console.error).toHaveBeenCalledTimes(1);
    const callArgs = mockManager.registry.console.error.mock.calls[0].join(' ');

    expect(callArgs).toMatch(/\[ERROR\]/);
    expect(callArgs).toMatch(new RegExp(mockISOStringParsed));
    expect(callArgs).toMatch(/test/);

    global.Date = originalDate;
  });

  it('should automatically stringify objects', () => {
    const mockObj = { nest: { data: [1, 2, 3] } };
    const err = new Error('mock error');

    logger.error('test', mockObj, err);

    const callArgs = mockManager.registry.console.error.mock.calls[0].join(' ');

    expect(callArgs).toMatch(/mock error/);
    expect(callArgs).not.toMatch(/\[object Object\]/);
    // Verifies JSON stringification worked
    expect(callArgs).toMatch(/"data":\[1,2,3\]/);
  });
});

describe('updateLoggerLevel', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('returns the updated config with the new level', () => {
    const result = updateLoggerLevel('warn');
    expect(result.level).toBe('warn');
  });

  it('gates logging by the new level (suppresses below, allows at/above)', () => {
    updateLoggerLevel('warn');

    logger.info('below threshold');
    expect(mockManager.registry.console.info).toHaveBeenCalledTimes(0);

    logger.warn('at threshold');
    expect(mockManager.registry.console.warn).toHaveBeenCalledTimes(1);
  });

  it('only changes the level, leaving other config intact', () => {
    updateLoggerConfig({ toggles: { skipTimestamps: true, skipFileDetails: true } });
    updateLoggerLevel('error');

    const config = JSON.parse(getLoggerConfig());
    expect(config.level).toBe('error');
    expect(config.toggles).toEqual({ skipTimestamps: true, skipFileDetails: true });
  });

  it('can disable logging entirely with "off"', () => {
    updateLoggerLevel('off');
    logger.error('should not appear');
    expect(mockManager.registry.console.error).toHaveBeenCalledTimes(0);
  });
});
