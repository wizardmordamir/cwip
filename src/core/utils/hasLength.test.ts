import { describe, expect, it } from 'bun:test';
import { hasLength } from './hasLength';

describe('hasLength', () => {
  it('returns true for a non-empty string', () => {
    expect(hasLength('a')).toBe(true);
    expect(hasLength('hello')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(hasLength('')).toBe(false);
  });

  it('returns false for nullish input', () => {
    expect(hasLength(null as any)).toBe(false);
    expect(hasLength(undefined as any)).toBe(false);
  });

  it('always returns a boolean', () => {
    expect(typeof hasLength('a')).toBe('boolean');
    expect(typeof hasLength('')).toBe('boolean');
    expect(typeof hasLength(undefined as any)).toBe('boolean');
  });
});
