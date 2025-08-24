import { jest } from '@jest/globals';
import { shouldLogMessage } from '../../logging';

import { removeModulesFromStack, showStackForError, isNetworkError, getMessageFromError } from '.';

jest.mock('../../logging', () => ({
  ...(jest.requireActual('../../logging') as object),
  shouldLogMessage: jest.fn(),
}));

describe('errors', () => {
  beforeEach(() => {
    jest.mocked(shouldLogMessage).mockImplementation(() => true);
  });

  type ErrorType = { code: string; message: string; stack?: string; response: any };

  const makeError: () => ErrorType = () => ({
    code: 'test',
    message: 'test',
    stack: 'test',
    response: {},
  });

  describe('isNetworkError', () => {
    it('should return true if error and error message are returned', async () => {
      expect(isNetworkError({ message: 'ETIMEOUT' })).toBe(true);
    });
    it('should return false if error and error message not returned', async () => {
      expect(isNetworkError({ message: 'my test message' })).toBe(false);
    });
  });

  describe('showStackForError', () => {
    it('should return false with error and no error stack', async () => {
      const err = makeError();
      delete err.stack;
      expect(showStackForError(err)).toBe(false);
    });

    it('should return false for error and error code in skipStackErrorCodes', async () => {
      expect(showStackForError({ ...makeError(), code: 'EREQUEST' })).toBe(false);
    });
  });

  describe('removeModulesFromStack', () => {
    it('should remove node_modules from stack', () => {
      const err = new Error('test error');
      const removedErr = removeModulesFromStack(err);
      expect(removedErr.stack.includes('/node_modules')).toBe(false);
    });

    it('should return undefined and not change error if no error stack', async () => {
      const errMsg = 'test err message';
      const err = new Error(errMsg);
      delete err.stack;
      removeModulesFromStack(err);
      expect(err.stack).toBe(undefined);
      expect(err.message).toBe(errMsg);
    });
  });

  describe('getMessageFromError Success', () => {
    it('should handle no params', () => {
      expect(getMessageFromError('')).toEqual('');
    });
  });
});
