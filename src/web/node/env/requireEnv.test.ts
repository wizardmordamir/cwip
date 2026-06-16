import { afterEach, describe, expect, it } from 'bun:test';
import { requireEnv } from '.';

const KEY = 'CWIP_TEST_REQUIRE_ENV';

afterEach(() => {
  delete process.env[KEY];
});

describe('requireEnv', () => {
  it('returns a set value', () => {
    process.env[KEY] = 'hello';
    expect(requireEnv(KEY)).toBe('hello');
  });

  it('throws a clear error when missing, with an optional hint', () => {
    expect(() => requireEnv(KEY)).toThrow(`Missing required environment variable ${KEY}.`);
    expect(() => requireEnv(KEY, { hint: 'set it in .env' })).toThrow('set it in .env');
  });

  it('rejects empty/whitespace by default, but allows it with rejectEmpty:false', () => {
    process.env[KEY] = '   ';
    expect(() => requireEnv(KEY)).toThrow();
    expect(requireEnv(KEY, { rejectEmpty: false })).toBe('   ');
  });
});
