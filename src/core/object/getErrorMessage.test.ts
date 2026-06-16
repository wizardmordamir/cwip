import { describe, expect, it } from 'bun:test';
import { getErrorMessage } from '.';

describe('getErrorMessage', () => {
  it('returns the message of an Error without the stack', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies non-Error throwables', () => {
    expect(getErrorMessage('plain string')).toBe('plain string');
    expect(getErrorMessage(42)).toBe('42');
  });

  it('returns empty for nullish', () => {
    expect(getErrorMessage(null)).toBe('');
    expect(getErrorMessage(undefined)).toBe('');
  });
});
