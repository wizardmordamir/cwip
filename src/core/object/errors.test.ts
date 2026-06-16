import { describe, expect, it } from 'bun:test';

import { getMessageFromError, isAxiosError, isNetworkError, removeModulesFromStack, showStackForError } from '.';

describe('errors', () => {
  type ErrorType = { code: string; message: string; stack?: string; response: any };

  const makeError: () => ErrorType = () => ({
    code: 'test',
    message: 'test',
    stack: 'test',
    response: {},
  });

  describe('isNetworkError', () => {
    it('should return true if error and error message are returned', () => {
      expect(isNetworkError({ message: 'ETIMEOUT' })).toBe(true);
    });
    it('should return false if error and error message not returned', () => {
      expect(isNetworkError({ message: 'my test message' })).toBe(false);
    });
  });

  describe('isAxiosError', () => {
    it('is true when a response is attached', () => {
      expect(isAxiosError({ response: { status: 500 } })).toBe(true);
    });
    it('is true when the isAxiosError flag is set (even without a response)', () => {
      expect(isAxiosError({ isAxiosError: true })).toBe(true);
    });
    it('is false for a plain error with neither marker', () => {
      expect(isAxiosError({ message: 'boom' })).toBe(false);
      expect(isAxiosError(new Error('boom'))).toBe(false);
    });
    // Regression: previously `!!err.response` threw a TypeError on a nullish arg.
    it('is null-safe — nullish or primitive args return false instead of throwing', () => {
      expect(isAxiosError(null)).toBe(false);
      expect(isAxiosError(undefined)).toBe(false);
      expect(isAxiosError('a string')).toBe(false);
      expect(isAxiosError(0)).toBe(false);
    });
    it('treats a non-strict-true isAxiosError flag as not-Axios', () => {
      expect(isAxiosError({ isAxiosError: 'yes' })).toBe(false);
      expect(isAxiosError({ isAxiosError: 1 })).toBe(false);
    });
  });

  describe('showStackForError', () => {
    it('returns true for an ordinary error that carries a stack', () => {
      expect(showStackForError({ stack: 'at foo (/app/x.ts:1:1)', message: 'boom' })).toBe(true);
    });

    it('returns false with error and no error stack', () => {
      const err = makeError();
      delete err.stack;
      expect(showStackForError(err)).toBe(false);
    });

    it('returns false for an Axios error (its stack is unhelpful)', () => {
      expect(showStackForError({ stack: 'at x', response: { status: 404 } })).toBe(false);
    });

    it('returns false for a network error', () => {
      expect(showStackForError({ stack: 'at x', code: 'ETIMEDOUT', message: 'down' })).toBe(false);
    });

    it('returns false for an error code in skipStackErrorCodes (no response, so the code path is exercised)', () => {
      expect(showStackForError({ stack: 'at x', code: 'EREQUEST', message: 'm' })).toBe(false);
      expect(showStackForError({ stack: 'at x', code: 'credentials_required', message: 'm' })).toBe(false);
    });

    it('is null-safe — a nullish error returns false', () => {
      expect(showStackForError(null)).toBe(false);
      expect(showStackForError(undefined)).toBe(false);
    });
  });

  describe('removeModulesFromStack', () => {
    it('drops node_modules, node-internal, and slash-less lines, keeping app frames', () => {
      const err: any = {
        stack: [
          'Error: boom',
          '    at foo (/app/src/foo.ts:1:1)',
          '    at lib (/app/node_modules/lib/index.js:2:2)',
          '    at q (node:internal/process/task_queues:96:5)',
          '    at bar (/app/src/bar.ts:3:3)',
        ].join('\n'),
      };
      const result = removeModulesFromStack(err);
      expect(result).toBe(err); // mutates + returns the same object
      expect(err.stack).not.toContain('/node_modules');
      expect(err.stack).not.toContain('internal/');
      expect(err.stack).not.toContain('Error: boom'); // no slash → dropped
      expect(err.stack).toContain('/app/src/foo.ts');
      expect(err.stack).toContain('/app/src/bar.ts');
    });

    it('removes node_modules frames from a real Error stack', () => {
      const err = new Error('test error');
      const removedErr = removeModulesFromStack(err);
      expect(removedErr.stack.includes('/node_modules')).toBe(false);
    });

    it('returns undefined and leaves the error unchanged when there is no stack', () => {
      const errMsg = 'test err message';
      const err = new Error(errMsg);
      // biome-ignore lint/performance/noDelete: deliberately remove the stack to test the guard
      delete err.stack;
      expect(removeModulesFromStack(err)).toBe(undefined);
      expect(err.stack).toBe(undefined);
      expect(err.message).toBe(errMsg);
    });

    it('is null-safe — a nullish argument returns undefined instead of throwing', () => {
      expect(removeModulesFromStack(null)).toBe(undefined);
      expect(removeModulesFromStack(undefined)).toBe(undefined);
    });
  });

  describe('getMessageFromError', () => {
    it('returns "" for falsy input', () => {
      expect(getMessageFromError('')).toBe('');
      expect(getMessageFromError(null)).toBe('');
      expect(getMessageFromError(undefined)).toBe('');
    });

    it('wraps a string in an Error and includes its message + stack', () => {
      const msg = getMessageFromError('boom');
      expect(msg).toContain('boom');
      expect(msg).toContain('stack:');
    });

    it('returns just the message (no stack) when the stack is suppressed (Axios error)', () => {
      expect(getMessageFromError({ message: 'http fail', response: { status: 500 }, stack: 'at x' })).toBe('http fail');
    });

    it('includes the stack for an ordinary error that carries one', () => {
      const msg = getMessageFromError({ message: 'kaboom', stack: 'at foo (/app/x.ts:1:1)' });
      expect(msg).toContain('kaboom');
      expect(msg).toContain('stack:');
      expect(msg).toContain('/app/x.ts');
    });

    // Documents current behavior: a messageless object falls back to stringifying
    // the whole object, so it yields "[object Object]". Locked so a future change
    // to that fallback is a deliberate, visible decision.
    it('falls back to the stringified object when there is no message', () => {
      expect(getMessageFromError({ code: 'X' })).toBe('[object Object]');
    });
  });
});
