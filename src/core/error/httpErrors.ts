import { AppError, type AppErrorOptions } from './AppError';

/**
 * Ready-made HTTP error subclasses over `AppError`. Each bakes in a default
 * `status`, `code`, `category`, and message, so a handler can just
 * `throw new NotFoundError('User not found')` and a terminal handler
 * (`cwip/server` `errorHandler` → `toErrorEnvelope`) maps it to the canonical
 * `{ error: { name, status, code, … } }` response. `status`/`code` are still
 * overridable per-instance via the options.
 */

/** Options for an HTTP error: same as `AppError` minus the baked-in defaults. */
export type HttpErrorOptions = Omit<AppErrorOptions, 'status' | 'code' | 'category'> & {
  status?: number;
  code?: string;
  category?: string;
};

/** 400 — malformed/invalid request. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', options: HttpErrorOptions = {}) {
    super(message, { status: 400, code: 'BAD_REQUEST', category: 'request', ...options });
  }
}

/** 401 — missing/invalid authentication. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', options: HttpErrorOptions = {}) {
    super(message, { status: 401, code: 'UNAUTHORIZED', category: 'auth', ...options });
  }
}

/** 403 — authenticated but not allowed. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', options: HttpErrorOptions = {}) {
    super(message, { status: 403, code: 'FORBIDDEN', category: 'auth', ...options });
  }
}

/** 404 — resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Not Found', options: HttpErrorOptions = {}) {
    super(message, { status: 404, code: 'NOT_FOUND', category: 'not_found', ...options });
  }
}

/** 409 — conflicts with current state (duplicate, version clash). */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', options: HttpErrorOptions = {}) {
    super(message, { status: 409, code: 'CONFLICT', category: 'conflict', ...options });
  }
}

/**
 * 422 — request understood but semantically invalid. Pass field details via
 * `context` (e.g. `{ context: { fields: ajv.errors } }`).
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', options: HttpErrorOptions = {}) {
    super(message, { status: 422, code: 'VALIDATION_ERROR', category: 'validation', ...options });
  }
}

/** 429 — too many requests. */
export class RateLimitError extends AppError {
  constructor(message = 'Too Many Requests', options: HttpErrorOptions = {}) {
    super(message, { status: 429, code: 'RATE_LIMITED', category: 'rate_limit', ...options });
  }
}
