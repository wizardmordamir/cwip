import { describe, expect, it } from 'bun:test';
import { createCachedTokenProvider } from '.';

describe('createCachedTokenProvider', () => {
  it('fetches once and reuses the cached token', async () => {
    let calls = 0;
    const get = createCachedTokenProvider({ fetchToken: async () => `t${++calls}` });
    expect(await get()).toBe('t1');
    expect(await get()).toBe('t1');
    expect(calls).toBe(1);
    expect(get.peek()).toBe('t1');
  });

  it('refreshes when the token is stale', async () => {
    let calls = 0;
    let stale = false;
    const get = createCachedTokenProvider({
      fetchToken: async () => `t${++calls}`,
      isExpired: () => stale,
    });
    expect(await get()).toBe('t1');
    stale = true;
    expect(await get()).toBe('t2');
    expect(calls).toBe(2);
  });

  it('force-refreshes and clear() drops the cache', async () => {
    let calls = 0;
    const get = createCachedTokenProvider({ fetchToken: async () => `t${++calls}` });
    await get();
    expect(await get(true)).toBe('t2');
    get.clear();
    expect(get.peek()).toBeNull();
    expect(await get()).toBe('t3');
  });

  it('shares a single in-flight fetch across concurrent callers', async () => {
    let calls = 0;
    const get = createCachedTokenProvider({
      fetchToken: async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 5));
        return 'tok';
      },
    });
    const [a, b] = await Promise.all([get(), get()]);
    expect(a).toBe('tok');
    expect(b).toBe('tok');
    expect(calls).toBe(1);
  });
});
