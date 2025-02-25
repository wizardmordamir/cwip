import { createLogger } from './log';

const getConsoleSpy = () => jest.spyOn(console, 'log').mockImplementation(jest.fn());

describe('log', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('log', () => {
    it('should log info', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest
        .spyOn(global, 'Date')
        .mockImplementation(() => ({
          toISOString: () => mockISOString,
          getTimezoneOffset: () => 60000,
        }));
      global.Date.now = () => 0;
      const consoleSpy = getConsoleSpy();
      createLogger().info('test');
      expect(nowSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      const consoleSpyRegex = new RegExp(
        `${mockISOString.slice(0, -1)} /lib/log.spec.js:[0-9]{1,4} test`,
      );
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
    it('should log info with config with time', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest
        .spyOn(global, 'Date')
        .mockImplementation(() => ({
          toISOString: () => mockISOString,
          getTimezoneOffset: () => 60000,
        }));
      global.Date.now = () => 0;
      const consoleSpy = getConsoleSpy();
      createLogger({ hideFile: true, hideTime: false, useLocalTime: false }).info('test', {
        a: 'b',
      });
      expect(nowSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const consoleSpyRegex = new RegExp(`${mockISOString} test {\n  "a": "b"\n}`);

      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
    it('should log info with config without time', async () => {
      const consoleSpy = getConsoleSpy();
      createLogger({ hideFile: true, hideTime: true, useLocalTime: false }).info('test', {
        a: 'b',
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('test {\n  "a": "b"\n}');
    });
    it('should log info with config useLocalTime', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest
        .spyOn(global, 'Date')
        .mockImplementation(() => ({
          toISOString: () => mockISOString,
          getTimezoneOffset: () => 60000,
        }));
      global.Date.now = () => 0;
      const consoleSpy = getConsoleSpy();
      createLogger({ hideFile: true, hideTime: false, useLocalTime: true }).info('test');
      expect(nowSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      // expect(consoleSpy).toHaveBeenCalledWith('test {\n  "a": "b"\n}');
      const consoleSpyRegex = new RegExp(`${mockISOString.slice(0, -1)} test`);

      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
    it('should log info with config timeFunction', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest
        .spyOn(global, 'Date')
        .mockImplementation(() => ({
          toISOString: () => mockISOString,
          getTimezoneOffset: () => 60000,
        }));
      global.Date.now = () => 0;
      const consoleSpy = getConsoleSpy();
      createLogger({
        hideFile: true,
        hideTime: false,
        useLocalTime: true,
        timeFunction: () => mockISOString,
      }).info('test');
      expect(nowSpy).toHaveBeenCalledTimes(0);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      // expect(consoleSpy).toHaveBeenCalledWith('test {\n  "a": "b"\n}');
      const consoleSpyRegex = new RegExp(`${mockISOString} test`);

      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
    it('should log info with config hideLine', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest
        .spyOn(global, 'Date')
        .mockImplementation(() => ({
          toISOString: () => mockISOString,
          getTimezoneOffset: () => 60000,
        }));
      global.Date.now = () => 0;
      const consoleSpy = getConsoleSpy();
      createLogger({
        hideFile: false,
        hideTime: false,
        hideLine: true,
        useLocalTime: false,
        timeFunction: () => mockISOString,
        stackIndex: 0,
      }).info('test', { a: 'b' });
      expect(nowSpy).toHaveBeenCalledTimes(0);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      // expect(consoleSpy).toHaveBeenCalledWith('test {\n  "a": "b"\n}');
      const consoleSpyRegex = new RegExp(`${mockISOString} /lib/log.ts test {\n  "a": "b"\n}`);

      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
  });
});
