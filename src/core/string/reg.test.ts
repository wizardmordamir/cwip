import { describe, expect, it } from 'bun:test';
import {
  alphaNumRegex,
  asciiExtendedRegex,
  escapeForRegex,
  isASCII,
  isPrintableASCII,
  makeRegexToMatchCharsInStr,
  makeRegexToMatchCharsNotInStr,
  removeFromEnd,
  removeFromEnds,
  removeFromMiddle,
  removeFromStart,
} from './reg';

describe('isASCII', () => {
  it('is true for 7-bit ASCII', () => {
    expect(isASCII('hello world 123!')).toBe(true);
    expect(isASCII('')).toBe(true);
  });

  it('is false for non-ASCII when extended is off (default)', () => {
    expect(isASCII('café')).toBe(false);
    expect(isASCII('™')).toBe(false);
  });

  it('accepts extended (8-bit) characters when extended=true', () => {
    expect(isASCII('café', true)).toBe(true);
    // still false for code points above 0xFF
    expect(isASCII('™', true)).toBe(false);
  });
});

describe('isPrintableASCII', () => {
  it('is true for printable characters and 8-bit extended', () => {
    expect(isPrintableASCII('Hello, World! 42')).toBe(true);
    expect(isPrintableASCII('café')).toBe(true);
  });

  it('is false for control characters', () => {
    expect(isPrintableASCII('line\nbreak')).toBe(false);
    expect(isPrintableASCII('\t')).toBe(false);
  });
});

describe('asciiExtendedRegex', () => {
  it('matches runs of characters outside the printable 8-bit range', () => {
    expect('a™b'.replace(asciiExtendedRegex, '')).toBe('ab');
  });
});

describe('alphaNumRegex', () => {
  it('matches runs of non-alphanumeric (apostrophe allowed) characters', () => {
    expect("o'brien-smith!".replace(alphaNumRegex, '')).toBe("o'briensmith");
  });
});

describe('escapeForRegex', () => {
  // Regression: the previous implementation called String.replaceAll without
  // re-assigning the (immutable) result, so it returned the input unchanged.
  it('escapes characters special inside a regex character class', () => {
    expect(escapeForRegex('[a-z]')).toBe('\\[a\\-z\\]');
    expect(escapeForRegex('a^b')).toBe('a\\^b');
    expect(escapeForRegex('a\\b')).toBe('a\\\\b');
  });

  it('leaves ordinary characters untouched', () => {
    expect(escapeForRegex('abc123')).toBe('abc123');
  });

  it('produces a string usable inside a character class', () => {
    const re = new RegExp(`[${escapeForRegex('a-z')}]`, 'g');
    // The "-" must be treated literally, not as a range a..z.
    expect('a-z'.match(re)).toEqual(['a', '-', 'z']);
    expect('m'.match(re)).toBeNull();
  });
});

describe('makeRegexToMatchCharsInStr', () => {
  it('matches the literal characters of the supplied string', () => {
    const re = makeRegexToMatchCharsInStr('a-z');
    expect('a-z'.match(re)).toEqual(['a', '-', 'z']);
    expect('x'.match(re)).toBeNull();
  });
});

describe('makeRegexToMatchCharsNotInStr', () => {
  it('matches characters that are not in the supplied string', () => {
    const re = makeRegexToMatchCharsNotInStr('abc');
    expect('abcd'.replace(re, '')).toBe('abc');
  });

  it('treats "-" as a literal, not a range', () => {
    const re = makeRegexToMatchCharsNotInStr('a-c');
    // "b" is NOT inside the set {a, -, c}, so it should be stripped.
    expect('abc-'.replace(re, '')).toBe('ac-');
  });
});

describe('removeFromStart', () => {
  it('strips the full leading run of the character', () => {
    expect(removeFromStart('xxxabc', 'x')).toBe('abc');
  });

  it('handles a single-character string', () => {
    expect(removeFromStart('x', 'x')).toBe('');
  });

  it('returns the string unchanged when it does not start with the character', () => {
    expect(removeFromStart('abc', 'x')).toBe('abc');
  });

  it('leaves interior and trailing occurrences alone', () => {
    expect(removeFromStart('xxaxbx', 'x')).toBe('axbx');
  });

  it('returns empty string when the whole string is the character', () => {
    expect(removeFromStart('xxxx', 'x')).toBe('');
  });
});

describe('removeFromEnd', () => {
  it('strips the full trailing run of the character', () => {
    expect(removeFromEnd('abcxxx', 'x')).toBe('abc');
  });

  it('handles a single-character string', () => {
    expect(removeFromEnd('x', 'x')).toBe('');
  });

  it('returns the string unchanged when it does not end with the character', () => {
    expect(removeFromEnd('abc', 'x')).toBe('abc');
  });

  it('leaves leading and interior occurrences alone', () => {
    expect(removeFromEnd('xaxbxx', 'x')).toBe('xaxb');
  });
});

describe('removeFromEnds', () => {
  it('strips both leading and trailing runs of the character', () => {
    expect(removeFromEnds('xxabcxx', 'x')).toBe('abc');
  });

  it('returns empty string when the whole string is the character', () => {
    expect(removeFromEnds('xxx', 'x')).toBe('');
  });

  it('leaves interior occurrences alone', () => {
    expect(removeFromEnds('xax', 'x')).toBe('a');
  });
});

describe('removeFromMiddle', () => {
  it('collapses interior consecutive duplicates of the character to one', () => {
    expect(removeFromMiddle('a--b--c', '-')).toBe('a-b-c');
  });

  it('leaves a single interior occurrence untouched', () => {
    expect(removeFromMiddle('a-b-c', '-')).toBe('a-b-c');
  });

  it('returns the string unchanged when the character is absent', () => {
    expect(removeFromMiddle('abc', '-')).toBe('abc');
  });
});
