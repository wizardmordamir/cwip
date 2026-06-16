import { describe, expect, it } from 'bun:test';
import { createSessionFetch } from '.';

// A fake fetch that records the Cookie header it received and replies with the
// queued Set-Cookie values for that call.
const fakeFetch = (script: Array<{ setCookie?: string[] }>) => {
  const seen: Array<string | null> = [];
  let i = 0;
  const fn = (async (_input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    seen.push(headers.get('cookie'));
    const step = script[i++] ?? {};
    const resHeaders = new Headers();
    const res = new Response('ok', { headers: resHeaders }) as Response & { getSetCookie?: () => string[] };
    // Override getSetCookie on the response's headers for the test runtime.
    (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => step.setCookie ?? [];
    return res;
  }) as unknown as typeof fetch;
  return { fn, seen };
};

describe('createSessionFetch', () => {
  it('carries Set-Cookie from one response into the next request', async () => {
    const { fn, seen } = fakeFetch([{ setCookie: ['session=abc; Path=/; HttpOnly', 'csrf=xyz; Path=/'] }, {}]);
    const sf = createSessionFetch({ fetch: fn });

    await sf('https://idp/login', { method: 'POST' });
    await sf('https://idp/api/me');

    expect(seen[0]).toBeNull(); // first call has no cookies yet
    expect(seen[1]).toBe('session=abc; csrf=xyz'); // jar applied on the second
    expect(sf.cookies()).toEqual({ session: 'abc', csrf: 'xyz' });
  });

  it('later Set-Cookie updates an existing cookie', async () => {
    const { fn, seen } = fakeFetch([{ setCookie: ['session=one'] }, { setCookie: ['session=two'] }, {}]);
    const sf = createSessionFetch({ fetch: fn });
    await sf('https://idp/a');
    await sf('https://idp/b');
    await sf('https://idp/c');
    expect(seen[1]).toBe('session=one');
    expect(seen[2]).toBe('session=two');
  });

  it('seeds from initialCookies and clear() empties the jar', async () => {
    const { fn, seen } = fakeFetch([{}, {}]);
    const sf = createSessionFetch({ fetch: fn, initialCookies: { seed: 'v' } });
    await sf('https://idp/a');
    expect(seen[0]).toBe('seed=v');
    sf.clear();
    await sf('https://idp/b');
    expect(seen[1]).toBeNull();
  });

  it("doesn't override a Cookie header the caller set explicitly", async () => {
    const { fn, seen } = fakeFetch([{ setCookie: ['session=abc'] }, {}]);
    const sf = createSessionFetch({ fetch: fn });
    await sf('https://idp/a');
    await sf('https://idp/b', { headers: { cookie: 'explicit=1' } });
    expect(seen[1]).toBe('explicit=1');
  });
});
