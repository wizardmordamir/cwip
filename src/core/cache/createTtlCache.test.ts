import { describe, expect, it } from 'bun:test';
import { createTtlCache } from '.';

const mutableClock = (start = 0) => {
  let now = start;
  const clock = () => now;
  return { clock, advance: (ms: number) => (now += ms) };
};

describe('createTtlCache', () => {
  it('stores and retrieves values', () => {
    const cache = createTtlCache<string, number>();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('expires entries after the ttl (lazily on read)', () => {
    const { clock, advance } = mutableClock();
    const cache = createTtlCache<string, number>({ ttlMs: 100, clock });
    cache.set('a', 1);
    advance(99);
    expect(cache.get('a')).toBe(1);
    advance(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('honors a per-entry ttl override and no-expiry default', () => {
    const { clock, advance } = mutableClock();
    const cache = createTtlCache<string, number>({ clock }); // ttl 0 → no expiry
    cache.set('forever', 1);
    cache.set('brief', 2, 50);
    advance(1000);
    expect(cache.get('forever')).toBe(1);
    expect(cache.get('brief')).toBeUndefined();
  });

  it('evicts the oldest entry past maxSize', () => {
    const cache = createTtlCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'
    expect(cache.has('a')).toBe(false);
    expect(cache.keys()).toEqual(['b', 'c']);
  });

  it('keys() omits expired entries', () => {
    const { clock, advance } = mutableClock();
    const cache = createTtlCache<string, number>({ ttlMs: 100, clock });
    cache.set('a', 1);
    cache.set('b', 2, 1000);
    advance(200);
    expect(cache.keys()).toEqual(['b']);
  });
});
