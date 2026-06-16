import { describe, expect, it } from 'bun:test';
import { containsString } from './containsString';

describe('containsString', () => {
  it('returns true when the substring is present (case-sensitive by default)', () => {
    expect(containsString('hello world', 'world')).toBe(true);
    expect(containsString('hello world', 'o w')).toBe(true);
  });

  it('returns false when the substring is absent or case differs', () => {
    expect(containsString('hello world', 'World')).toBe(false);
    expect(containsString('hello world', 'xyz')).toBe(false);
  });

  it('matches case-insensitively when insensitive=true', () => {
    expect(containsString('Hello World', 'WORLD', true)).toBe(true);
    expect(containsString('Hello World', 'hello', true)).toBe(true);
  });

  it('treats the empty substring as always contained', () => {
    expect(containsString('anything', '')).toBe(true);
    expect(containsString('', '')).toBe(true);
  });
});
