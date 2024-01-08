import { log } from './log';

describe('log', () => {
  describe('log', () => {
    it('should log info', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      log()('test');
      expect(consoleSpy).toHaveBeenCalled(1);
    });
  });
});
