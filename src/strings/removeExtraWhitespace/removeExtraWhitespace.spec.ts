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
    expect(removeExtraWhitespace(42 as any)).toBe(42);
    expect(removeExtraWhitespace(true as any)).toBe(true);
    expect(removeExtraWhitespace(null as any)).toBe(null);
    expect(removeExtraWhitespace(undefined as any)).toBe(undefined);
    expect(removeExtraWhitespace({} as any)).toEqual({});
  });
});
