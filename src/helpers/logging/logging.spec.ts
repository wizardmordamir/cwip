import * as times from '../times';
import * as logging from '../logging';

const { cleanDataForLogging, loggingSettings, shouldLogMessage } = logging;

describe('logging', () => {
  describe('shouldLogMessage', () => {
    beforeEach(() => {
      loggingSettings.disableSameMessagesLimit = false;
      loggingSettings.priorMessages = {};
    });

    it('should return true for misssing message', async () => {
      expect(shouldLogMessage('')).toBe(true);
    });
    it('should return true when appconfig is not limiting messages', async () => {
      loggingSettings.disableSameMessagesLimit = true;
      expect(shouldLogMessage('hi')).toBe(true);
    });

    it.only('should return true when called consecutively', async () => {
      loggingSettings.disableSameMessagesLimit = false;
      shouldLogMessage('hi');
      expect(shouldLogMessage('hi')).toBe(true);
    });

    it('should return true if enough time elapsed since last message counter began', async () => {
      loggingSettings.disableSameMessagesLimit = false;
      const logSpy = jest.spyOn(times, 'hoursPastDate');
      logSpy.mockReturnValueOnce(3);
      shouldLogMessage(2, 'default');
      expect(shouldLogMessage(2, 'default')).toBe(true);
    });

    it('should return true when count is too low', () => {
      const message = 'test message';
      loggingSettings.priorMessages.default = {};
      expect(shouldLogMessage(message, 'default')).toBe(true);
    });

    it('should return false when count is too high', () => {
      const message = 'test message';
      loggingSettings.priorMessages.default = {};
      loggingSettings.priorMessages.default[message] = { date: new Date(), count: 3 };
      expect(shouldLogMessage(message, 'default')).toBe(false);
    });
  });
  describe('cleanDataForLogging', () => {
    it('should clean data for logging', () => {
      const hidden = 'HIDDEN';
      const password = 'TEST_PASSWORD';
      const env = { password };
      expect(password).toEqual('testPassword');
      let opts;
      expect(cleanDataForLogging(opts, env)).toEqual(undefined);
      opts = { auth: password };
      expect(cleanDataForLogging(opts, env)).toEqual({ auth: hidden });
      opts = { headers: { Authorization: password } };
      expect(cleanDataForLogging(opts, env)).toEqual({ headers: { Authorization: hidden } });
      opts = { data: [{ thumbnailPhoto: password }] };
      expect(cleanDataForLogging(opts, env)).toEqual({
        data: [{ thumbnailPhoto: password.slice(0, 5) }],
      });
    });
  });
});
