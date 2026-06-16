import { type AppErrorSummary, isAppError } from './AppError';

/**
 * The canonical error wire shape: an `AppErrorSummary` under `error`, with an
 * optional request `correlationId` alongside it. Every server emits this; every
 * client parses it. The nesting leaves room for top-level request metadata
 * (`correlationId`, and future fields) without colliding with the error fields.
 *
 *   { "error": { "name": "NotFoundError", "message": "…", "code": "NOT_FOUND",
 *       "status": 404, "category": "not_found", "isOperational": true,
 *       "timestamp": "2026-…" },
 *     "correlationId": "a1b2c3" }
 */
export interface ErrorEnvelope {
  error: AppErrorSummary;
  correlationId?: string;
}

export interface ToErrorEnvelopeOptions {
  /** Request trace id, surfaced at the top level for log correlation. */
  correlationId?: string;
  /**
   * Include a non-`AppError`'s raw message in the response. Default `false` — an
   * unrecognized/programmer error becomes a generic 500 so internals don't leak.
   * `AppError`s are always serialized in full (they're meant to be client-safe).
   */
  exposeMessage?: boolean;
}

/**
 * Turn any thrown value into the canonical {@link ErrorEnvelope}. An `AppError`
 * (or subclass) serializes via `getSummary()`. Anything else becomes a generic
 * 500 — its `status`/`statusCode` is honored if it's a number, but its message
 * is hidden unless `exposeMessage` is set. This is the single error formatter
 * (it replaces the old `makeErrorJson`).
 */
export const toErrorEnvelope = (err: unknown, options: ToErrorEnvelopeOptions = {}): ErrorEnvelope => {
  const { correlationId, exposeMessage = false } = options;
  const withId = (error: AppErrorSummary): ErrorEnvelope => (correlationId ? { error, correlationId } : { error });

  if (isAppError(err)) {
    return withId(err.getSummary());
  }

  const rawStatus =
    (err as { status?: unknown; statusCode?: unknown })?.status ?? (err as { statusCode?: unknown })?.statusCode;
  const status = typeof rawStatus === 'number' ? rawStatus : 500;
  const message = exposeMessage && err instanceof Error ? err.message : 'Internal Server Error';

  return withId({
    name: err instanceof Error ? err.name : 'Error',
    message,
    status,
    isOperational: false,
    timestamp: new Date().toISOString(),
  });
};
