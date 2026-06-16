import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as logging from './logging';

const { cleanDataForLogging, cleanStringForLogging, loggingSettings, shouldLogMessage } = logging;

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

    it('should return true when called consecutively', async () => {
      loggingSettings.disableSameMessagesLimit = false;
      shouldLogMessage('hi');
      expect(shouldLogMessage('hi')).toBe(true);
    });

    it('should reset the counter and return true once enough time has elapsed', () => {
      loggingSettings.disableSameMessagesLimit = false;
      const message = 'over-limit message';
      // Seed an over-limit counter whose timestamp is two hours in the past, so the
      // real hoursPastDate(...) > 1 branch fires (no module mocking needed).
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      loggingSettings.priorMessages.default = { [message]: { date: twoHoursAgo, count: 3 } };

      expect(shouldLogMessage(message, 'default')).toBe(true);
      // the window rolled over, so the counter restarted at 1
      expect(loggingSettings.priorMessages.default[message].count).toBe(1);
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
    const hidden = 'HIDDEN';

    // cleanDataForLogging mutates the shared loggingSettings singleton via secretProps;
    // restore the defaults after every case so sibling suites see a clean slate.
    afterEach(() => {
      loggingSettings.secretProps = [];
      loggingSettings.redactionText = hidden;
    });

    it('returns falsy values unchanged', () => {
      expect(cleanDataForLogging(undefined, {})).toEqual(undefined);
      expect(cleanDataForLogging(null, {})).toEqual(null);
    });

    it('redacts the auth field', () => {
      expect(cleanDataForLogging({ auth: 'TEST_PASSWORD' }, {})).toEqual({ auth: hidden });
    });

    it('redacts the Authorization header regardless of key casing', () => {
      expect(cleanDataForLogging({ headers: { Authorization: 'Bearer t' } }, {})).toEqual({
        headers: { Authorization: hidden },
      });
      expect(cleanDataForLogging({ headers: { authorization: 'Bearer t' } }, {})).toEqual({
        headers: { authorization: hidden },
      });
      expect(cleanDataForLogging({ headers: { AUTHORIZATION: 'Bearer t' } }, {})).toEqual({
        headers: { AUTHORIZATION: hidden },
      });
    });

    it('drops the axios response.config blob', () => {
      expect(cleanDataForLogging({ status: 500, response: { config: { secret: 'x' }, data: 'oops' } }, {})).toEqual({
        status: 500,
        response: { data: 'oops' },
      });
    });

    it('replaces configured secret values found anywhere in the payload', () => {
      const password = 'TEST_PASSWORD';
      loggingSettings.secretProps = ['password'];
      expect(cleanDataForLogging({ note: `pw is ${password}`, nested: { password } }, { password })).toEqual({
        note: `pw is ${hidden}`,
        nested: { password: hidden },
      });
    });

    it('leaves non-secret fields intact', () => {
      expect(cleanDataForLogging({ user: 'alice', count: 3 }, {})).toEqual({
        user: 'alice',
        count: 3,
      });
    });
  });

  describe('cleanStringForLogging', () => {
    afterEach(() => {
      loggingSettings.secretProps = [];
    });

    it('redacts secret values found in a raw string', () => {
      loggingSettings.secretProps = ['token'];
      expect(cleanStringForLogging('auth=abc123&x=1', { token: 'abc123' })).toEqual('auth=HIDDEN&x=1');
    });

    it('returns the string unchanged when no secretProps are configured', () => {
      loggingSettings.secretProps = [];
      expect(cleanStringForLogging('auth=abc123', { token: 'abc123' })).toEqual('auth=abc123');
    });
  });
});
