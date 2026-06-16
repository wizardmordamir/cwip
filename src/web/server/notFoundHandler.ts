import type { Request, RequestHandler, Response } from 'express';
import { NotFoundError } from '../../core/error/httpErrors';
import { toErrorEnvelope } from '../../core/error/toErrorEnvelope';

/**
 * A terminal 404 handler — mount it after all routes (but before `errorHandler`)
 * so unmatched requests get a consistent JSON 404 (the canonical error envelope)
 * instead of express's HTML default.
 *
 *   app.use(notFoundHandler());
 */
export const notFoundHandler = (): RequestHandler => {
  return (req: Request, res: Response) => {
    res.status(404).json(toErrorEnvelope(new NotFoundError(`Not found: ${req.method} ${req.path}`)));
  };
};
