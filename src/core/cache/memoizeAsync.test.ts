import { describe, expect, it } from 'bun:test';
import { memoizeAsync } from '.';

const mutableClock = (start = 0) => {
  let now = start;
  const clock = () => now;
  return { clock, advance: (ms: number) => (now += ms) };
};

/** A promise whose resolve/reject you control, for driving the in-flight window. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('memoizeAsync', () => {
  it('caches a result so repeat calls for the same key fetch once', async () => {
    let calls = 0;
    const get = memoizeAsync(
      async (id: string) => {
        calls++;
        return `value-${id}`;
      },
      { key: (id) => id },
    );

    expect(await get('a')).toBe('value-a');
    expect(await get('a')).toBe('value-a');
    expect(calls).toBe(1);
  });

  it('keys distinct arguments independently', async () => {
    let calls = 0;
    const get = memoizeAsync(
      async (id: string) => {
        calls++;
        return id;
      },
      { key: (id) => id },
    );

    await get('a');
    await get('b');
    await get('a');
    expect(calls).toBe(2);
  });

  it('expires a cached result after the ttl', async () => {
    const { clock, advance } = mutableClock();
    let calls = 0;
    const get = memoizeAsync(
      async (id: string) => {
        calls++;
        return id;
      },
      { key: (id) => id, ttlMs: 100, clock },
    );

    await get('a');
    advance(99);
    await get('a');
    expect(calls).toBe(1);
    advance(1);
    await get('a');
    expect(calls).toBe(2);
  });

  it('de-duplicates concurrent in-flight calls for the same key', async () => {
    let calls = 0;
    const d = deferred<string>();
    const get = memoizeAsync(
      async (id: string) => {
        calls++;
        return d.promise.then((v) => `${id}-${v}`);
      },
      { key: (id) => id },
    );

    const p1 = get('a');
    const p2 = get('a');
    expect(calls).toBe(1); // second call joined the first's in-flight promise

    d.resolve('done');
    expect(await p1).toBe('a-done');
    expect(await p2).toBe('a-done');
    expect(calls).toBe(1);
  });

  it('does not cache a rejected call and re-fetches next time', async () => {
    let calls = 0;
    const get = memoizeAsync(
      async () => {
        calls++;
        if (calls === 1) {
          throw new Error('boom');
        }
        return 'ok';
      },
      { key: () => 'k' },
    );

    await expect(get()).rejects.toThrow('boom');
    expect(await get()).toBe('ok'); // retried, not a cached error
    expect(calls).toBe(2);
  });

  it('skips caching results that fail shouldCache', async () => {
    let calls = 0;
    const get = memoizeAsync(
      async () => {
        calls++;
        return { rows: calls === 1 ? [] : [1] };
      },
      { key: () => 'k', shouldCache: (r) => r.rows.length > 0 },
    );

    await get(); // empty → not cached
    await get(); // re-fetched, now has rows → cached
    await get(); // served from cache
    expect(calls).toBe(2);
  });

  it('exposes peek, invalidate, and clear', async () => {
    let calls = 0;
    const get = memoizeAsync(
      async (id: string) => {
        calls++;
        return `v-${id}`;
      },
      { key: (id) => id },
    );

    expect(get.peek('a')).toBeUndefined();
    await get('a');
    expect(get.peek('a')).toBe('v-a');

    get.invalidate('a');
    expect(get.peek('a')).toBeUndefined();
    await get('a');
    expect(calls).toBe(2);

    get.clear();
    expect(get.peek('a')).toBeUndefined();
  });
});
