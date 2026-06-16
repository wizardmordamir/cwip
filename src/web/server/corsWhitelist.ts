import type { RequestHandler } from 'express';
import { requirePeer } from '../../core/_internal/requirePeer';

export interface CorsWhitelistOptions {
  /**
   * Allowed origins as exact strings and/or RegExps (matched case-insensitively
   * against the request `Origin`). An empty/omitted list with `allowNoOrigin`
   * still permits non-browser clients.
   */
  whitelist: Array<string | RegExp>;
  /** Send `Access-Control-Allow-Credentials: true` (default `true`). */
  credentials?: boolean;
  /**
   * Allow requests with no `Origin` header (curl, server-to-server, same-origin
   * navigations) — CORS is a browser mechanism, so these aren't cross-origin
   * attacks. Default `true`.
   */
  allowNoOrigin?: boolean;
  /** Called when an origin is rejected (for logging/metrics). */
  onReject?: (origin: string) => void;
}

type CorsModule = typeof import('cors');

/**
 * Build CORS middleware from a string/RegExp origin whitelist — the common
 * "allow my known frontends, reject everything else" setup, generalized from an
 * app's env-specific cors config. Resolves the optional `cors` peer at call time
 * (clear error if missing).
 *
 *   app.use(corsWhitelist({ whitelist: ['https://app.example.com', /\.example\.com$/] }));
 */
export const corsWhitelist = (options: CorsWhitelistOptions): RequestHandler => {
  const { whitelist, credentials = true, allowNoOrigin = true, onReject } = options;
  const mod = requirePeer<CorsModule>('cors', 'server');
  const cors = ((mod as { default?: CorsModule }).default ?? mod) as CorsModule;

  return cors({
    credentials,
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        return callback(null, allowNoOrigin);
      }
      const normalized = origin.toLowerCase();
      const allowed = whitelist.some((item) =>
        typeof item === 'string' ? item.toLowerCase() === normalized : item.test(origin),
      );
      if (!allowed) {
        onReject?.(origin);
        return callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
      }
      return callback(null, true);
    },
  }) as RequestHandler;
};
