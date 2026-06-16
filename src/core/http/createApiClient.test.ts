import { describe, expect, it } from 'bun:test';
import { ApiError, createApiClient } from '.';

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

// The global `fetch` type carries a `preconnect` member a plain lambda lacks; this
// adapts a test double to `typeof fetch` without weakening the source signature.
const stubFetch = (fn: (url: string | URL, init?: RequestInit) => Promise<Response>): typeof fetch =>
  fn as unknown as typeof fetch;

describe('createApiClient', () => {
  it('GETs and parses JSON, resolving the path against the base', async () => {
    let seenUrl = '';
    const client = createApiClient({
      name: 'svc',
      baseUrl: 'https://api.test',
      fetch: stubFetch(async (url) => {
        seenUrl = String(url);
        return jsonResponse({ ok: true });
      }),
    });
    const { data, status } = await client.get<{ ok: boolean }>('/thing', { query: { a: 1 } });
    expect(seenUrl).toBe('https://api.test/thing?a=1');
    expect(data).toEqual({ ok: true });
    expect(status).toBe(200);
  });

  it('JSON-encodes object bodies and sets content-type', async () => {
    let init: RequestInit | undefined;
    const client = createApiClient({
      name: 'svc',
      baseUrl: 'https://api.test',
      fetch: stubFetch(async (_url, i) => {
        init = i;
        return jsonResponse({});
      }),
    });
    await client.post('/x', { hello: 'world' });
    expect(init?.body).toBe('{"hello":"world"}');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
  });

  it('adds bearer auth headers', async () => {
    let auth: string | null | undefined;
    const client = createApiClient({
      name: 'svc',
      baseUrl: 'https://api.test',
      auth: { type: 'bearer', token: 'abc' },
      fetch: stubFetch(async (_url, i) => {
        auth = new Headers(i?.headers).get('authorization');
        return jsonResponse({});
      }),
    });
    await client.get('/x');
    expect(auth).toBe('Bearer abc');
  });

  it('throws a tagged ApiError on non-2xx, with the parsed body', async () => {
    const client = createApiClient({
      name: 'svc',
      baseUrl: 'https://api.test',
      fetch: stubFetch(async () => jsonResponse({ message: 'nope' }, { status: 422, statusText: 'Unprocessable' })),
    });
    const err = (await client.get('/x').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.body).toEqual({ message: 'nope' });
    expect(err.client).toBe('svc');
  });

  it('normalizes network failures into ApiError(status 0)', async () => {
    const client = createApiClient({
      name: 'svc',
      baseUrl: 'https://api.test',
      fetch: stubFetch(async () => {
        throw new Error('boom');
      }),
    });
    const err = (await client.get('/x').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.body).toBe('boom');
  });
});
