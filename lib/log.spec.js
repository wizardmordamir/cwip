import * as times from './times';
import { log } from './log';

describe('log', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('log', () => {
    it('should log info', async () => {
      const nowSpy = jest.spyOn(times, 'now').mockImplementation(() => '2024-01-01T01:01:01.001Z');
      const consoleSpy = jest.spyOn(console, 'log');
      log()('test');
      expect(nowSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('2024-01-01T01:01:01.001Z \\lib\\log.js:741 test');
    });
    it('should log info with config', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      log({
        hidefunction: true,
        hideline: true,
        hidefile: true,
        hidetime: true,
      })('test', { a: 'b' });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('test {\n  \"a\": \"b\"\n}');
    });
  });
});
