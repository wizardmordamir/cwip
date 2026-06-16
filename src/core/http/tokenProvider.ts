/**
 * Memoize an async token fetch, refreshing only when the cached token is missing
 * or stale. Both reference flows that inspired this cached a freshly-minted token
 * and reused it until it neared expiry; this is that pattern, dependency-free.
 *
 * The staleness check is injectable so it fits any token: JWTs (decode `exp` via
 * `isJwtExpired`), opaque tokens (close over a fetch time + TTL), or "never
 * expires" (omit it). Concurrent callers during a refresh share one in-flight
 * fetch, so a burst of requests triggers a single login.
 *
 *   const getToken = createCachedTokenProvider({
 *     fetchToken: () => login(),                 // does the expensive multi-step login
 *     isExpired: (t) => isJwtExpired(t, 30),     // refresh 30s before it lapses
 *   });
 *   await getToken();        // logs in once
 *   await getToken();        // returns the cached token
 *   await getToken(true);    // forces a fresh login
 */
export interface CachedTokenProvider {
  /** Get a valid token, refreshing if missing/stale (or `force` is true). */
  (force?: boolean): Promise<string>;
  /** The currently-cached token without fetching (`null` if none). */
  peek(): string | null;
  /** Drop the cached token so the next call re-fetches. */
  clear(): void;
}

export interface CachedTokenProviderOptions {
  /** Mint a fresh token (the expensive login). */
  fetchToken: () => Promise<string>;
  /** Whether a cached token should be considered stale. Default: never stale. */
  isExpired?: (token: string) => boolean;
}

export const createCachedTokenProvider = (options: CachedTokenProviderOptions): CachedTokenProvider => {
  const isExpired = options.isExpired ?? (() => false);
  let token: string | null = null;
  let inflight: Promise<string> | null = null;

  const provider = (async (force = false): Promise<string> => {
    if (!force && token && !isExpired(token)) {
      return token;
    }
    if (!inflight) {
      inflight = options.fetchToken().then(
        (fresh) => {
          token = fresh;
          inflight = null;
          return fresh;
        },
        (err) => {
          inflight = null;
          throw err;
        },
      );
    }
    return inflight;
  }) as CachedTokenProvider;

  provider.peek = () => token;
  provider.clear = () => {
    token = null;
  };
  return provider;
};
