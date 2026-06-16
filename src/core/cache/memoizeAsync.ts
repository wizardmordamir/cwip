import { createTtlCache } from './createTtlCache';

/**
 * Wrap an async function with keyed, TTL'd result caching and in-flight
 * de-duplication. This is the multi-key generalization of
 * `createCachedTokenProvider` (which caches a single token): the app-local
 * "build a cache key → check timestamp vs TTL → fetch → conditionally store"
 * dance that recurs around external-API reads, collapsed into one primitive.
 *
 * Three things it does that a bare `createTtlCache` makes you hand-roll:
 *  - **keying** — a `key(...args)` turns the call arguments into a cache key;
 *  - **dedup** — concurrent calls for the same key share ONE in-flight call,
 *    so a burst of identical requests hits upstream once (a `Map` cache alone
 *    lets them all miss and all fire);
 *  - **conditional caching** — `shouldCache` lets you skip storing useless
 *    results (e.g. an empty/`404`-shaped response) so they're retried next time.
 *
 * Only successful results are cached: a rejected call is never stored and never
 * shared past its own settlement, so a transient failure doesn't pin an error.
 *
 *   const getUser = memoizeAsync(
 *     (racf: string, fields: string[]) => fetchUser(racf, fields),
 *     { key: (racf, fields) => `${racf}:${fields.join(',')}`, ttlMs: 3 * 60_000,
 *       shouldCache: (r) => r.users.length > 0 },
 *   );
 *   await getUser('abc', ['name']);   // fetches
 *   await getUser('abc', ['name']);   // cached
 *   getUser.invalidate('abc', ['name']);
 */
export interface MemoizeAsyncOptions<A extends unknown[], R> {
  /** Build a stable cache key from the call arguments. */
  key: (...args: A) => string;
  /** Time-to-live in ms for a cached result. `0`/omitted = cache until evicted. */
  ttlMs?: number;
  /** Cap on distinct cached keys; oldest-inserted is evicted on overflow. */
  maxSize?: number;
  /** Proactively sweep expired entries on this interval (ms). Omitted = lazy-only. */
  sweepMs?: number;
  /** Only cache results that pass this test (e.g. "has any rows"). Default: cache everything. */
  shouldCache?: (result: R) => boolean;
  /** Injectable clock (default `Date.now`) for deterministic tests. */
  clock?: () => number;
}

export interface MemoizedAsync<A extends unknown[], R> {
  (...args: A): Promise<R>;
  /** The cached value for these args without fetching (`undefined` if absent/expired). */
  peek(...args: A): R | undefined;
  /** Drop the cached entry for these args so the next call re-fetches. */
  invalidate(...args: A): void;
  /** Drop every cached entry (does not abort in-flight calls). */
  clear(): void;
  /** Stop the periodic sweep timer, if any (call on shutdown). */
  stopSweep(): void;
}

export const memoizeAsync = <A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: MemoizeAsyncOptions<A, R>,
): MemoizedAsync<A, R> => {
  const { key, ttlMs, maxSize, sweepMs, clock } = options;
  const shouldCache = options.shouldCache ?? (() => true);
  const cache = createTtlCache<string, R>({ ttlMs, maxSize, sweepMs, clock });
  const inflight = new Map<string, Promise<R>>();

  const memoized = ((...args: A): Promise<R> => {
    const cacheKey = key(...args);

    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    // A call for this key is already in flight — join it instead of firing again.
    const pending = inflight.get(cacheKey);
    if (pending) {
      return pending;
    }

    const promise = fn(...args).then(
      (result) => {
        if (shouldCache(result)) {
          cache.set(cacheKey, result);
        }
        inflight.delete(cacheKey);
        return result;
      },
      (err) => {
        inflight.delete(cacheKey);
        throw err;
      },
    );
    inflight.set(cacheKey, promise);
    return promise;
  }) as MemoizedAsync<A, R>;

  memoized.peek = (...args: A) => cache.get(key(...args));
  memoized.invalidate = (...args: A) => {
    cache.delete(key(...args));
  };
  memoized.clear = () => cache.clear();
  memoized.stopSweep = () => cache.stopSweep();

  return memoized;
};
