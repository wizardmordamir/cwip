import { runErrorHooks } from './errorHooks';

export interface AppErrorOptions {
  /** Machine-readable code, e.g. `'NOT_FOUND'`, `'RATE_LIMITED'`. */
  code?: string;
  /** HTTP status to map to, when this error surfaces over HTTP. */
  status?: number;
  /** Coarse grouping, e.g. `'validation'`, `'auth'`, `'upstream'`. */
  category?: string;
  /** Structured, log-safe context for debugging (ids, inputs, …). */
  context?: Record<string, unknown>;
  /** Underlying error being wrapped (standard error chaining). */
  cause?: unknown;
  /**
   * `true` (default) = an expected, handled condition (bad input, 404). `false` =
   * a programmer/bug error. Lets a top-level handler decide what's safe to expose
   * and whether to crash.
   */
  isOperational?: boolean;
}

/**
 * The canonical, flat, serializable view of an `AppError` — the single error
 * shape every app emits and parses (see `toErrorEnvelope` for the wire wrapper).
 */
export interface AppErrorSummary {
  name: string;
  message: string;
  code?: string;
  /** HTTP status, when this error surfaces over HTTP. */
  status?: number;
  category?: string;
  context?: Record<string, unknown>;
  isOperational: boolean;
  /** ISO-8601 time the error was created. */
  timestamp: string;
}

/**
 * A structured application error: a normal `Error` plus machine-readable fields
 * (`code`, `status`, `category`, `context`) and an `isOperational` flag that
 * separates expected conditions from bugs. Subclass it for domain errors (see
 * `httpErrors.ts` for the ready-made HTTP ones), or use it directly. Every
 * construction runs the registered error hooks (see `registerErrorHook`) for
 * dependency-free instrumentation.
 *
 *   throw new AppError('User not found', { code: 'NOT_FOUND', status: 404,
 *     category: 'lookup', context: { userId } });
 *
 *   class PaymentError extends AppError {}  // domain subclass; hooks still fire
 */
export class AppError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly category?: string;
  readonly context?: Record<string, unknown>;
  readonly isOperational: boolean;
  /** ISO-8601 time the error was created. */
  readonly timestamp: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    // Subclasses get their own constructor name (e.g. 'PaymentError').
    this.name = new.target.name;
    this.code = options.code;
    this.status = options.status;
    this.category = options.category;
    this.context = options.context;
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // V8 (Node/Chrome) only; trims the constructor frame from the stack.
    if (typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === 'function') {
      (Error as unknown as { captureStackTrace: (t: object, c: unknown) => void }).captureStackTrace(this, new.target);
    }

    runErrorHooks(this);
  }

  /** A flat, log/transport-safe view (used by capture sinks and error responses). */
  getSummary(): AppErrorSummary {
    return {
      name: this.name,
      message: this.message,
      ...(this.code !== undefined && { code: this.code }),
      ...(this.status !== undefined && { status: this.status }),
      ...(this.category !== undefined && { category: this.category }),
      ...(this.context !== undefined && { context: this.context }),
      isOperational: this.isOperational,
      timestamp: this.timestamp,
    };
  }

  /** Serialize as the summary (so `JSON.stringify(err)` is meaningful). */
  toJSON(): AppErrorSummary {
    return this.getSummary();
  }
}

/** Type guard for `AppError` (and subclasses). */
export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
