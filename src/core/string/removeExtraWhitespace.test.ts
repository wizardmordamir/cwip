import { describe, expect, it } from 'bun:test';
import { removeExtraWhitespace } from '.';

describe('removeExtraWhitespace', () => {
  it('should remove extra whitespace from a string', () => {
    const input = '  Hello   World  ';
    const result = removeExtraWhitespace(input);
    expect(result).toBe('Hello World');
  });

  it('should handle strings with no extra whitespace', () => {
    const input = 'Hello World';
    const result = removeExtraWhitespace(input);
    expect(result).toBe('Hello World');
  });

  it('should handle empty strings', () => {
    const input = '';
    const result = removeExtraWhitespace(input);
    expect(result).toBe('');
  });

  it('should handle strings with only whitespace', () => {
    const input = '     ';
    const result = removeExtraWhitespace(input);
    expect(result).toBe('');
  });

  it('should handle strings with tabs and newlines', () => {
    const input = '\tHello \n World\t';
    const result = removeExtraWhitespace(input);
    expect(result).toBe('Hello World');
  });

  it('should return non-string inputs unchanged', () => {
    expect(removeExtraWhitespace(42)).toBe(42);
    expect(removeExtraWhitespace(true)).toBe(true);
    expect(removeExtraWhitespace(null)).toBe(null);
    expect(removeExtraWhitespace(undefined)).toBe(undefined);
    expect(removeExtraWhitespace({})).toEqual({});
  });
});
