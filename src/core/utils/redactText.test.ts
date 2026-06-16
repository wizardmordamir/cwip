import { describe, expect, it } from 'bun:test';
import { redactText } from './redactText';

describe('redactText', () => {
  it('should redact a string with 1 char for outer chars', () => {
    const redactedString = redactText({ str: 'testing', num: 1 });
    expect(redactedString).toBe('t[REDACTED]g');
  });

  it('should redact a string with 2 chars for outer chars', () => {
    const redactedString = redactText({ str: 'testing', num: 2 });
    expect(redactedString).toBe('te[REDACTED]ng');
  });

  it('should return redaction text if the string is undefined', () => {
    const str = undefined as unknown as string;
    const redactedString = redactText({ str, num: 1 });
    expect(redactedString).toBe('[REDACTED]');
  });

  it('should allow custom redaction text', () => {
    const redactedString = redactText({ str: 'testing', num: 1, redactionText: 'CUSTOM' });
    expect(redactedString).toBe('tCUSTOMg');
  });

  it('should default to fully redacted', () => {
    const redactedString = redactText({ str: 'testing' });
    expect(redactedString).toBe('[REDACTED]');
  });

  it('should return redaction text for falsy sanitized value', () => {
    const redactedString = redactText({ str: false as unknown as string, num: 1 });
    expect(redactedString).toBe('[REDACTED]');
  });
});
