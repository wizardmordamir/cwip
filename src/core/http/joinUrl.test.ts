import { describe, expect, it } from 'bun:test';
import { joinUrl } from '.';

describe('joinUrl', () => {
  it('joins with exactly one slash, normalizing leading/trailing slashes', () => {
    expect(joinUrl('https://api.example.com/', '/v1/', '/users')).toBe('https://api.example.com/v1/users');
    expect(joinUrl('https://api.example.com', 'v1', 'users')).toBe('https://api.example.com/v1/users');
    expect(joinUrl('/api', 'health')).toBe('/api/health');
  });

  it('preserves the protocol double slash', () => {
    expect(joinUrl('https://x.com', 'a')).toBe('https://x.com/a');
    expect(joinUrl('http://x.com//', '//a//', '//b')).toBe('http://x.com/a/b');
  });

  it('preserves a trailing slash on the final segment', () => {
    expect(joinUrl('https://x.com', 'a', 'b/')).toBe('https://x.com/a/b/');
  });

  it('skips empty/nullish segments', () => {
    expect(joinUrl('https://x.com', '', undefined, 'a', null)).toBe('https://x.com/a');
    expect(joinUrl()).toBe('');
  });
});
