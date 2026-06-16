import { describe, expect, it } from 'bun:test';
import { buildUrl } from '.';

describe('buildUrl', () => {
  it('joins base + path', () => {
    expect(buildUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users');
    expect(buildUrl('https://api.example.com/', 'users')).toBe('https://api.example.com/users');
  });

  it('appends query params, skipping null/undefined', () => {
    expect(buildUrl('https://api.example.com', '/users', { page: 2, q: 'a b', skip: null, gone: undefined })).toBe(
      'https://api.example.com/users?page=2&q=a+b',
    );
  });

  it('uses an absolute path as-is', () => {
    expect(buildUrl('https://api.example.com', 'https://other.com/x')).toBe('https://other.com/x');
  });
});
