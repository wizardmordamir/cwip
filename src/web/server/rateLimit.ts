import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RateLimitError } from '../../core/error/httpErrors';
import { toErrorEnvelope } from '../../core/error/toErrorEnvelope';

/** Default key: the client IP, best-effort across common proxy headers. */
export const clientIp = (req: Request): string =>
  (
    (req as { ip?: string }).ip ||
    (req.headers?.['x-forwarded-for'] as string | undefined) ||
    (req as { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
    'unknown'
  ).toString();

/** What a throttled request reports — passed to `onLimit` and `handler`. */
export interface RateLimitInfo {
  key: string;
  /** Seconds until the window resets (the `Retry-After` value). */
  retryAfter: number;
  req: Request;
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key per window. */
  max: number;
  /** Key a request is counted under (default: client IP). */
  keyFn?: (req: Request) => string;
  /**
   * Exempt a request from limiting entirely (default: none). Use for health
   * checks, allowlisted IPs, already-authenticated users, etc. — anything you'd
   * otherwise have to wrap the middleware to skip.
   */
  skip?: (req: Request) => boolean;
  /** Client-facing message on the rejection (default: a generic "too many requests"). */
  message?: string;
  /** Status code on rejection (default `429`). */
  statusCode?: number;
  /** Set the `Retry-After` response header (default `true`). */
  setRetryAfter?: boolean;
  /** Observe each throttled request (wire to your logger / metrics). */
  onLimit?: (info: RateLimitInfo) => void;
  /** Resolve a correlation id to surface in the error envelope (default: `req.correlationId`). */
  getCorrelationId?: (req: Request) => string | undefined;
  /**
   * Fully own the rejection response — the escape hatch for any shape the
   * defaults don't cover (custom body, HTML, routing through `next`). When set,
   * cwip sets `Retry-After` (unless disabled) and calls this instead of writing
   * the envelope; you control the rest.
   */
  handler?: (req: Request, res: Response, next: NextFunction, info: RateLimitInfo) => void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * A tiny, dependency-free fixed-window rate limiter. Keyed (by default) on the
 * client IP, it caps requests per window and responds 429 with `Retry-After` and
 * the canonical {@link toErrorEnvelope} shape (a {@link RateLimitError}) when
 * exceeded. In-memory and single-instance — meant to blunt brute-force / flooding
 * on sensitive endpoints (login, signup, password reset), not to coordinate a
 * cluster. Generalized from an app's auth rate limiter.
 *
 * Every part is overridable so app-specific variations need no fork — the key,
 * a `skip` predicate, status code, message, whether to set `Retry-After`, and a
 * `handler` escape hatch that fully owns the rejection response.
 *
 *   app.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 30 }), loginHandler);
 */
export const rateLimit = (options: RateLimitOptions): RequestHandler => {
  const { windowMs, max, keyFn = clientIp, skip, message, onLimit, getCorrelationId, handler } = options;
  const statusCode = options.statusCode ?? 429;
  const setRetryAfter = options.setRetryAfter ?? true;
  const buckets = new Map<string, Bucket>();

  // Opportunistic cleanup so the map can't grow unbounded under key churn.
  const sweep = (now: number) => {
    if (buckets.size < 5000) return;
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip?.(req)) return next();

    const now = Date.now();
    const key = keyFn(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      if (setRetryAfter) res.setHeader('Retry-After', String(retryAfter));
      const info: RateLimitInfo = { key, retryAfter, req };
      onLimit?.(info);
      if (handler) {
        handler(req, res, next, info);
        return;
      }
      const correlationId = getCorrelationId?.(req) ?? (req as { correlationId?: string }).correlationId;
      res.status(statusCode).json(
        toErrorEnvelope(new RateLimitError(message ?? 'Too many requests — please try again later.'), {
          correlationId,
        }),
      );
      return;
    }

    sweep(now);
    next();
  };
};
