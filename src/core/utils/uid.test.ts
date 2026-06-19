import { describe, expect, test } from 'bun:test';
import { uid } from './uid';

describe('uid', () => {
  test('returns a string', () => {
    expect(typeof uid()).toBe('string');
  });

  test('returns a non-empty string', () => {
    expect(uid().length).toBeGreaterThan(0);
  });

  test('returns a unique value each call', () => {
    const ids = Array.from({ length: 200 }, uid);
    expect(new Set(ids).size).toBe(200);
  });

  test('returns a UUID when crypto.randomUUID is available', () => {
    const id = uid();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(UUID_RE.test(id)).toBe(true);
  });
});
