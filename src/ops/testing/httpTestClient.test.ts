import { describe, expect, it } from 'bun:test';
import { HttpTestError, makeHttpTestClient } from './httpTestClient';

// A fetch stub that echoes the request back so we can assert what was sent.
// Cast to `typeof fetch` (the lib type also wants `.preconnect`, which a stub
// never needs).
const echoFetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
  const body = init.body;
  return new Response(
    JSON.stringify({
      url: String(url),
      method: init.method,
      headers: Object.fromEntries(new Headers(init.headers as any).entries()),
      body: typeof body === 'string' ? body : null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}) as typeof fetch;

describe('makeHttpTestClient', () => {
  it('builds absolute urls, sends JSON, and parses JSON responses', async () => {
    const c = makeHttpTestClient({ baseUrl: 'http://x', fetchImpl: echoFetch });
    const res = await c.post('/api/lists', { name: 'Groceries' });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('http://x/api/lists');
    expect(res.body.method).toBe('POST');
    expect(res.body.headers['content-type']).toBe('application/json');
    expect(JSON.parse(res.body.body)).toEqual({ name: 'Groceries' });
  });

  it('merges default headers and withHeaders overrides', async () => {
    const c = makeHttpTestClient({ baseUrl: 'http://x', headers: { cookie: 'a=1' }, fetchImpl: echoFetch });
    const res = await c.withHeaders({ 'x-test': 'y' }).get('/api/me');
    expect(res.body.headers.cookie).toBe('a=1');
    expect(res.body.headers['x-test']).toBe('y');
  });

  it('does not throw on non-2xx — the caller asserts on status', async () => {
    const c = makeHttpTestClient({
      baseUrl: 'http://x',
      fetchImpl: (async () => new Response('nope', { status: 403 })) as unknown as typeof fetch,
    });
    const res = await c.get('/api/secret');
    expect(res.status).toBe(403);
    expect(res.ok).toBe(false);
    expect(res.body).toBe('nope');
  });

  it('wraps a network failure in HttpTestError with request context', async () => {
    const c = makeHttpTestClient({
      baseUrl: 'http://x',
      fetchImpl: (async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch,
    });
    let caught: unknown;
    try {
      await c.get('/api/down');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(HttpTestError);
    expect((caught as HttpTestError).detail.url).toBe('http://x/api/down');
    expect((caught as HttpTestError).detail.method).toBe('GET');
  });
});
