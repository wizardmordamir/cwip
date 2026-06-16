import { describe, expect, it } from 'bun:test';
import { type CapturedResponse, type CaptureRecord, captureFetch } from '.';

// Adapt a test double to `typeof fetch` (which carries a `preconnect` member).
const stubFetch = (fn: (url: string | URL, init?: RequestInit) => Promise<Response>): typeof fetch =>
  fn as unknown as typeof fetch;

describe('captureFetch', () => {
  it('captures request + response and leaves the response body readable', async () => {
    const records: CaptureRecord[] = [];
    const res = await captureFetch(
      'https://api.test/users',
      { method: 'POST', body: JSON.stringify({ name: 'Ada' }), headers: { 'x-trace': '1' } },
      {
        label: 'create-user',
        sink: (r) => records.push(r) as unknown as undefined,
        fetch: stubFetch(
          async () =>
            new Response(JSON.stringify({ id: 7 }), { status: 201, headers: { 'content-type': 'application/json' } }),
        ),
      },
    );

    // The returned Response is still fully readable (capture cloned it).
    expect(await res.json()).toEqual({ id: 7 });

    expect(records).toHaveLength(1);
    const rec = records[0];
    expect(rec.kind).toBe('fetch');
    expect(rec.request).toEqual({
      url: 'https://api.test/users',
      method: 'POST',
      headers: { 'x-trace': '1' },
      body: '{"name":"Ada"}',
    });
    const response = rec.response as CapturedResponse;
    expect(response.status).toBe(201);
    expect(response.json).toEqual({ id: 7 });
    expect(response.bodyText).toBe('{"id":7}');
  });

  it('captures fetch errors (and re-throws)', async () => {
    const records: CaptureRecord[] = [];
    const promise = captureFetch(
      'https://api.test/x',
      {},
      {
        label: 'boom',
        sink: (r) => records.push(r) as unknown as undefined,
        fetch: stubFetch(async () => {
          throw new Error('network down');
        }),
      },
    );
    await expect(promise).rejects.toThrow('network down');
    expect(records[0].error?.message).toBe('network down');
    expect(records[0].response).toBeUndefined();
  });

  it('truncates large bodies to maxBodyChars', async () => {
    const records: CaptureRecord[] = [];
    await captureFetch(
      'https://api.test/big',
      {},
      {
        label: 'big',
        maxBodyChars: 10,
        sink: (r) => records.push(r) as unknown as undefined,
        fetch: stubFetch(async () => new Response('x'.repeat(100))),
      },
    );
    expect((records[0].response as CapturedResponse).bodyText).toBe(`${'x'.repeat(10)}…[truncated]`);
  });
});
