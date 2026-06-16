import { afterEach, describe, expect, it } from 'bun:test';
import { boolEnv, optionalEnv } from '.';

const KEY = 'CWIP_TEST_OPTIONAL_ENV';

afterEach(() => {
  delete process.env[KEY];
});

describe('optionalEnv', () => {
  it('returns the value when set, else the fallback', () => {
    expect(optionalEnv(KEY, 'default')).toBe('default');
    process.env[KEY] = 'set';
    expect(optionalEnv(KEY, 'default')).toBe('set');
  });

  it('returns undefined with no fallback', () => {
    expect(optionalEnv(KEY)).toBeUndefined();
  });

  it('treats empty/whitespace as unset', () => {
    process.env[KEY] = '  ';
    expect(optionalEnv(KEY, 'fallback')).toBe('fallback');
  });
});

describe('boolEnv', () => {
  it('parses truthy and falsy spellings case-insensitively', () => {
    for (const v of ['1', 'true', 'YES', 'On']) {
      process.env[KEY] = v;
      expect(boolEnv(KEY)).toBe(true);
    }
    for (const v of ['0', 'false', 'No', 'off']) {
      process.env[KEY] = v;
      expect(boolEnv(KEY)).toBe(false);
    }
  });

  it('uses the fallback when unset or unrecognized', () => {
    expect(boolEnv(KEY, true)).toBe(true);
    process.env[KEY] = 'maybe';
    expect(boolEnv(KEY, true)).toBe(true);
  });
});
