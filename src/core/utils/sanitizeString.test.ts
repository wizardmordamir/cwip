import { describe, expect, it } from 'bun:test';
import { sanitizeString } from './sanitizeString';

describe('sanitizeString', () => {
  it('should sanitize a string', () => {
    const sanitizedString = sanitizeString({
      sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      str: '<script>test</script>',
    });
    expect(sanitizedString).toBe('&lt;script&gt;test&lt;/script&gt;');
  });

  it('should return an empty string if the string is undefined', () => {
    const sanitizedString = sanitizeString({
      sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      str: undefined as unknown as string,
    });
    expect(sanitizedString).toBe('');
  });

  it('should return empty string for falsy sanitized value', () => {
    const sanitizedString = sanitizeString({
      sanitize: (_str) => false as unknown as string,
      str: 'test',
    });
    expect(sanitizedString).toBe('');
  });
});
