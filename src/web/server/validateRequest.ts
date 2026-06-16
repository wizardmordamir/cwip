import type { Schema, ValidateFunction } from 'ajv';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationError } from '../../core/error/httpErrors';
import { toErrorEnvelope } from '../../core/error/toErrorEnvelope';
import type { SchemaError } from '../../core/schema/normalizeSchemaErrors';
import { normalizeSchemaErrors } from '../../core/schema/normalizeSchemaErrors';
import { compileSchema } from '../../core/schema/validate';

/**
 * Either a raw JSON Schema (compiled lazily, then cached) or a pre-compiled Ajv
 * validator (a function carrying `.errors`). Accepting both makes the middleware
 * a drop-in for apps that already compile their validators per route.
 */
export type SchemaOrValidator = Schema | ValidateFunction;

export interface ValidateOptions {
  /** HTTP status on failure (default `400`). */
  status?: number;
  /** Client-facing message on failure (default `"Validation failed"`). */
  message?: string;
  /** Resolve a correlation id for the error envelope (default: `req.correlationId`). */
  getCorrelationId?: (req: Request) => string | undefined;
  /**
   * Fully own the failure response — the escape hatch for any shape the default
   * envelope doesn't cover. When set, cwip calls this instead of responding, so
   * you can build a custom body or route through your own error handler, e.g.
   * `onError: (errors, _req, _res, next) => next(new ValidationError('bad', { context: { errors } }))`.
   */
  onError?: (errors: SchemaError[], req: Request, res: Response, next: NextFunction) => void;
}

const isValidator = (input: SchemaOrValidator): input is ValidateFunction => typeof input === 'function';

const makeValidator = (input: SchemaOrValidator): ValidateFunction =>
  isValidator(input) ? input : compileSchema(input);

const validateRequest = (
  pick: (req: Request) => unknown,
  input: SchemaOrValidator,
  options: ValidateOptions = {},
): RequestHandler => {
  // Compile once at wiring time (cached on the shared Ajv instance for schemas).
  const validate = makeValidator(input);
  const status = options.status ?? 400;
  const message = options.message ?? 'Validation failed';

  return (req: Request, res: Response, next: NextFunction) => {
    if (validate(pick(req))) return next();

    const errors = normalizeSchemaErrors(validate.errors);
    if (options.onError) {
      options.onError(errors, req, res, next);
      return;
    }
    const correlationId = options.getCorrelationId?.(req) ?? (req as { correlationId?: string }).correlationId;
    res
      .status(status)
      .json(toErrorEnvelope(new ValidationError(message, { status, context: { errors } }), { correlationId }));
  };
};

/**
 * Validate `req.body` against a JSON Schema or pre-compiled Ajv validator. On
 * failure responds with the canonical {@link toErrorEnvelope} shape — a
 * {@link ValidationError} (status `400` by default; pass `{ status: 422 }` for
 * the stricter semantic) whose `context.errors` carries the normalized field
 * errors. The express wrapper around `cwip/schema`.
 *
 *   app.post('/notes', validateBody(noteSchema), createNote);
 *   app.post('/login', validateBody(validateLoginSchema), login); // pre-compiled
 */
export const validateBody = (input: SchemaOrValidator, options?: ValidateOptions): RequestHandler =>
  validateRequest((req) => req.body, input, options);

/** Like {@link validateBody}, but validates `req.query`. */
export const validateQuery = (input: SchemaOrValidator, options?: ValidateOptions): RequestHandler =>
  validateRequest((req) => req.query, input, options);

/** Like {@link validateBody}, but validates `req.params`. */
export const validateParams = (input: SchemaOrValidator, options?: ValidateOptions): RequestHandler =>
  validateRequest((req) => req.params, input, options);
