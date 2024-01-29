import { log } from './log';

describe('log', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('log', () => {
    it('should log info', async () => {
      const mockISOString = '2024-01-01T01:01:01.001Z';
      const nowSpy = jest.spyOn(global, 'Date').mockImplementation(() => ({
        toISOString: () => mockISOString,
      }));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
      log()('test');
      expect(nowSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const consoleSpyCalledWith = consoleSpy.mock.calls[0][0];
      const consoleSpyRegex = new RegExp(`${mockISOString} \\\\lib\\\\log.ts:[0-9]{1,4} test`);
      expect([consoleSpyCalledWith, consoleSpyRegex.test(consoleSpyCalledWith)]).toEqual([
        consoleSpyCalledWith,
        true,
      ]);
    });
    it('should log info with config', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
      log({
        hideFile: true,
        hideTime: true,
      })('test', { a: 'b' });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('test {\n  "a": "b"\n}');
    });
  });
});
