import type { MongoClient, MongoClientOptions } from 'mongodb';
import { requirePeer } from '../../core/_internal/requirePeer';

/**
 * Exponential backoff with full jitter for retry attempt `n` (1-based), clamped
 * to `[min, max]`. Pure and deterministic given `rand` (default `Math.random`),
 * so it's unit-testable. `delay = clamp(min * 2^(n-1)) * jitter`.
 */
export const backoffDelay = (
  attempt: number,
  { minMs = 200, maxMs = 5000, rand = Math.random }: { minMs?: number; maxMs?: number; rand?: () => number } = {},
): number => {
  const exp = Math.min(maxMs, minMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exp * (0.5 + rand() * 0.5)); // full jitter in [50%, 100%] of exp
};

type MongoModule = typeof import('mongodb');

export interface ConnectMongoOptions {
  /** Max connection attempts before giving up (default 5). */
  retries?: number;
  /** Backoff floor in ms (default 200). */
  minDelayMs?: number;
  /** Backoff ceiling in ms (default 5000). */
  maxDelayMs?: number;
  /** Driver options passed to `new MongoClient(uri, ...)`. */
  clientOptions?: MongoClientOptions;
  /** Observe each failed attempt before the next retry. */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /** Injectable client factory (for tests); defaults to the real `mongodb` peer. */
  createClient?: (uri: string, options?: MongoClientOptions) => MongoClient;
  /** Injectable sleep (for tests); defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with bounded retry + exponential backoff — the
 * connect-with-reconnect logic that's near-identical across apps, generalized and
 * dependency-injectable. Resolves the optional `mongodb` peer at call time
 * (unless `createClient` is supplied). Returns the connected `MongoClient`; throws
 * the last error if every attempt fails.
 *
 *   const client = await connectMongo(uri, { retries: 8, onRetry: (n, e) => log(n, e) });
 */
export const connectMongo = async (uri: string, options: ConnectMongoOptions = {}): Promise<MongoClient> => {
  const { retries = 5, minDelayMs = 200, maxDelayMs = 5000, clientOptions, onRetry } = options;
  const sleep = options.sleep ?? defaultSleep;

  const createClient =
    options.createClient ??
    ((u: string, o?: MongoClientOptions) => {
      const mod = requirePeer<MongoModule>('mongodb', 'mongodb');
      return new mod.MongoClient(u, o);
    });

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = createClient(uri, clientOptions);
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      // Best-effort cleanup of the half-open client before retrying.
      await client.close().catch(() => {});
      if (attempt < retries) {
        const delay = backoffDelay(attempt, { minMs: minDelayMs, maxMs: maxDelayMs });
        onRetry?.(attempt, error, delay);
        await sleep(delay);
      }
    }
  }
  throw lastError;
};
