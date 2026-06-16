/**
 * An in-memory key→value cache with per-entry TTL. Browser-safe (just a `Map`
 * plus timers), so it lives in the package root rather than `cwip/node`.
 * Generalized from the app-local "small cached data sets" pattern into a real
 * TTL store: expiry is lazy (checked on read) and, optionally, swept on an
 * interval so abandoned keys don't pin memory. An optional `maxSize` evicts the
 * oldest entry on overflow (insertion-order, `Map`-backed).
 *
 *   const cache = createTtlCache<string, User>({ ttlMs: 60_000, sweepMs: 30_000 });
 *   cache.set('u1', user);
 *   cache.get('u1');           // user, or undefined once expired
 *   cache.stopSweep();         // on shutdown, clear the interval
 */
export interface TtlCacheOptions {
  /** Default time-to-live in ms for `set` without an explicit ttl. `0`/omitted = no expiry. */
  ttlMs?: number;
  /** Cap on entries; on overflow the oldest-inserted entry is evicted. */
  maxSize?: number;
  /** Sweep interval in ms that proactively deletes expired entries. Omitted = lazy-only. */
  sweepMs?: number;
  /** Injectable clock (default `Date.now`) for deterministic tests. */
  clock?: () => number;
}

export interface TtlCache<K, V> {
  get(key: K): V | undefined;
  /** Store `value`; `ttlMs` overrides the cache default for this entry. */
  set(key: K, value: V, ttlMs?: number): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
  /** Live (non-expired) keys, oldest first. */
  keys(): K[];
  /** Stop the periodic sweep timer (no-op if none). Call on shutdown. */
  stopSweep(): void;
}

interface Entry<V> {
  value: V;
  /** Epoch ms when this entry expires, or `Infinity` for no expiry. */
  expiresAt: number;
}

export const createTtlCache = <K, V>(options: TtlCacheOptions = {}): TtlCache<K, V> => {
  const { ttlMs = 0, maxSize, sweepMs } = options;
  const clock = options.clock ?? (() => Date.now());
  const store = new Map<K, Entry<V>>();

  const isExpired = (entry: Entry<V>): boolean => clock() >= entry.expiresAt;

  const purge = (key: K, entry: Entry<V> | undefined): boolean => {
    if (entry && isExpired(entry)) {
      store.delete(key);
      return true;
    }
    return false;
  };

  let sweepTimer: ReturnType<typeof setInterval> | undefined;
  if (sweepMs && sweepMs > 0) {
    sweepTimer = setInterval(() => {
      for (const [key, entry] of store) {
        if (isExpired(entry)) {
          store.delete(key);
        }
      }
    }, sweepMs);
    // Don't keep the event loop alive for a cache sweep (Node/Bun only; harmless elsewhere).
    (sweepTimer as { unref?: () => void })?.unref?.();
  }

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry || purge(key, entry)) {
        return undefined;
      }
      return entry.value;
    },
    set(key, value, perEntryTtl) {
      const ttl = perEntryTtl ?? ttlMs;
      const expiresAt = ttl > 0 ? clock() + ttl : Number.POSITIVE_INFINITY;
      // Re-insert to move the key to the newest position (insertion-order eviction).
      store.delete(key);
      store.set(key, { value, expiresAt });
      if (maxSize && store.size > maxSize) {
        const oldest = store.keys().next().value as K;
        store.delete(oldest);
      }
    },
    has(key) {
      const entry = store.get(key);
      if (!entry || purge(key, entry)) {
        return false;
      }
      return true;
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
    keys() {
      const live: K[] = [];
      for (const [key, entry] of store) {
        if (!isExpired(entry)) {
          live.push(key);
        }
      }
      return live;
    },
    stopSweep() {
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = undefined;
      }
    },
  };
};
