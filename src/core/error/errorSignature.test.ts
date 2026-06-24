import { describe, expect, test } from 'bun:test';
import { errorSignature, normalizeErrorMessage, normalizeErrorUrl } from './errorSignature';

describe('normalizeErrorUrl', () => {
  test('collapses numeric ids, uuids, long hex/tokens', () => {
    expect(normalizeErrorUrl('/api/notes/42')).toBe('/api/notes/:id');
    expect(normalizeErrorUrl('/api/notes/550e8400-e29b-41d4-a716-446655440000')).toBe('/api/notes/:id');
    expect(normalizeErrorUrl('/api/files/0123456789abcdef0123')).toBe('/api/files/:id');
    expect(normalizeErrorUrl('/api/x/aVeryLongOpaqueTokenSegment12345')).toBe('/api/x/:id');
  });

  test('strips the query string and leaves stable segments', () => {
    expect(normalizeErrorUrl('/api/search?q=hello&page=2')).toBe('/api/search');
    expect(normalizeErrorUrl('/api/lists/12/rows/34')).toBe('/api/lists/:id/rows/:id');
  });

  test('empty / root paths normalize to /', () => {
    expect(normalizeErrorUrl('')).toBe('/');
    expect(normalizeErrorUrl('/')).toBe('/');
    expect(normalizeErrorUrl(null)).toBe('/');
  });
});

describe('normalizeErrorMessage', () => {
  test('collapses uuids, numbers, and quoted values; caps length', () => {
    expect(normalizeErrorMessage('row 42 not found')).toBe('row <n> not found');
    expect(normalizeErrorMessage("column 'email' is bad")).toBe('column <v> is bad');
    expect(normalizeErrorMessage('id 550e8400-e29b-41d4-a716-446655440000 gone')).toBe('id <id> gone');
    expect(normalizeErrorMessage('x'.repeat(500)).length).toBe(200);
  });
});

describe('errorSignature', () => {
  test('the same bug at different ids shares one signature', () => {
    const a = errorSignature({
      name: 'TypeError',
      message: "cannot read 'x' of undefined",
      method: 'GET',
      url: '/api/notes/1',
      status: 500,
    });
    const b = errorSignature({
      name: 'TypeError',
      message: "cannot read 'y' of undefined",
      method: 'GET',
      url: '/api/notes/9999',
      status: 500,
    });
    expect(a.signature).toBe(b.signature);
    expect(a.route).toBe('/api/notes/:id');
  });

  test('different routes / statuses do NOT collide', () => {
    const a = errorSignature({ name: 'Error', message: 'boom', method: 'POST', url: '/api/a', status: 500 });
    const b = errorSignature({ name: 'Error', message: 'boom', method: 'POST', url: '/api/b', status: 500 });
    expect(a.signature).not.toBe(b.signature);
  });

  test('a bare 5xx with no name groups under HTTP <status>', () => {
    const s = errorSignature({ method: 'get', url: '/api/x', status: 503 });
    expect(s.name).toBe('HTTP 503');
    expect(s.method).toBe('GET');
  });
});
