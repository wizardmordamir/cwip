import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { toErrorEnvelope } from '../../core/error/toErrorEnvelope';

export interface ErrorHandlerOptions {
  /** Observe every handled error (wire to your logger). */
  log?: (error: unknown) => void;
  /**
   * Include the raw error message in the response for non-`AppError` errors.
   * Default `false` — generic errors return "Internal Server Error" so internals
   * don't leak. `AppError`s always return their full summary (they're meant to
   * be client-safe).
   */
  exposeMessage?: boolean;
  /**
   * Resolve a request trace id to surface in the envelope (for log correlation).
   * Defaults to reading `req.correlationId` (set by the {@link correlationId}
   * middleware), so the two pair up with no extra wiring.
   */
  getCorrelationId?: (req: Request) => string | undefined;
}

/**
 * A terminal express error handler. Emits the canonical {@link toErrorEnvelope}
 * shape — `{ error: { name, message, code?, status?, category?, context?,
 * isOperational, timestamp }, correlationId? }`. `AppError`s map to their
 * `status` (else 500) with their full summary; anything else becomes a 500 (or
 * its own numeric `status`/`statusCode`) with a generic message unless
 * `exposeMessage` is set. Mount it last, after the routes.
 *
 *   app.use(errorHandler({ log: (e) => logger.error(e) }));
 */
export const errorHandler = (options: ErrorHandlerOptions = {}): ErrorRequestHandler => {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    options.log?.(err);

    const correlationId = options.getCorrelationId?.(req) ?? (req as { correlationId?: string }).correlationId;
    const envelope = toErrorEnvelope(err, {
      exposeMessage: options.exposeMessage,
      correlationId,
    });
    res.status(envelope.error.status ?? 500).json(envelope);
  };
};
