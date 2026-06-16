import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { makeCorrelationId } from '../../core/utils/makeCorrelationId';

export interface CorrelationIdOptions {
  /** Inbound header read for an existing id (default `x-correlation-id`). */
  header?: string;
  /**
   * Header the id is echoed back on (default: same as {@link header}). Set it
   * when a caller sends one header name but you must surface another.
   */
  responseHeader?: string;
  /** Generate a fresh id when there's none to reuse (default {@link makeCorrelationId}). */
  generate?: () => string;
  /** Property stashed on the request object (default `correlationId`). */
  property?: string;
  /** Echo the id back on the response header (default `true`). */
  echo?: boolean;
  /**
   * Reuse an inbound `header` value when present (default `true`). Set `false` to
   * always mint a fresh id — appropriate when clients are untrusted and a
   * caller-supplied id would be a log-injection / correlation-spoofing vector.
   * Can also be a predicate to accept only ids you consider valid (e.g. a length
   * / charset check); returning `false` falls back to {@link generate}.
   */
  trustInbound?: boolean | ((value: string, req: Request) => boolean);
}

/**
 * Per-request correlation id middleware: reuse an inbound `x-correlation-id`
 * header if present (so an id set at the edge / by a caller survives), else
 * generate one, stash it on `req.correlationId`, and echo it on the response.
 * Mount it first so request logging and the error handler can surface the same
 * id — `errorHandler` reads `req.correlationId` by default, closing the loop.
 *
 * Every part is overridable so app-specific variations need no fork: the read
 * and echo header names, the generator, the request property, whether to echo,
 * and whether (or which) inbound ids to trust.
 *
 *   app.use(correlationId());
 *   app.use(correlationId({ header: 'x-request-id', trustInbound: false }));
 */
export const correlationId = (options: CorrelationIdOptions = {}): RequestHandler => {
  const header = options.header ?? 'x-correlation-id';
  const responseHeader = options.responseHeader ?? header;
  const generate = options.generate ?? makeCorrelationId;
  const property = options.property ?? 'correlationId';
  const echo = options.echo ?? true;
  const trustInbound = options.trustInbound ?? true;

  return (req: Request, res: Response, next: NextFunction) => {
    const inbound = req.get?.(header) ?? (req.headers?.[header] as string | undefined);
    const accept =
      typeof inbound === 'string' &&
      inbound.length > 0 &&
      (typeof trustInbound === 'function' ? trustInbound(inbound, req) : trustInbound);
    const id = accept ? (inbound as string) : generate();
    (req as unknown as Record<string, unknown>)[property] = id;
    if (echo) res.setHeader(responseHeader, id);
    next();
  };
};
