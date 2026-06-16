import { isAppError } from '../../core/error/AppError';
import { logger as defaultLogger, type Logger } from '../../core/logging/logger';
import { safeStringify } from '../../core/object/safeStringify';

export interface InstallUncaughtErrorHandlersOptions {
  /** Logger to log with. Defaults to cwip's `logger`. */
  logger?: Pick<Logger, 'error'>;
  /**
   * Exit the process after logging an `uncaughtException`. This is Node's
   * recommendation — after an uncaught throw the process is in an undefined state
   * — but it's **off by default** to match the additive, keep-running style: your
   * own `process.on('uncaughtException', …)` listeners still run alongside cwip's.
   * Turn it on for fail-fast services.
   */
  exitOnUncaughtException?: boolean;
  /** Exit code used when `exitOnUncaughtException` is true. Default `1`. */
  exitCode?: number;
}

/**
 * A structured, log-friendly view of a thrown value. An `AppError` contributes
 * its full canonical summary (code/status/category/context/…); any other error
 * contributes name/message/code; a non-error its string form. The `stack` is
 * always included (unlike the wire `toErrorEnvelope`, which omits it).
 */
const describeError = (err: unknown): Record<string, unknown> => {
  if (isAppError(err)) {
    return { ...err.getSummary(), stack: err.stack };
  }
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...((err as { code?: unknown }).code !== undefined && { code: (err as { code?: unknown }).code }),
      stack: err.stack,
    };
  }
  return { name: 'NonError', message: typeof err === 'string' ? err : safeStringify(err) };
};

/**
 * Install default `uncaughtException` / `unhandledRejection` handlers that log the
 * error in a consistent, structured shape (via cwip's logger and the `AppError`
 * summary). Process-level (`process.on`), so it lives under `cwip/node`.
 *
 * `process.on` is **additive**: after calling this you can register your OWN
 * `process.on('uncaughtException', …)` / `unhandledRejection` listeners and they
 * run alongside cwip's — so there's no callback parameter to thread your logic
 * through. Calling this again is idempotent: it removes cwip's previous handlers
 * first (it never touches listeners you added yourself), so you won't double-log.
 *
 * Returns an uninstall function that removes the handlers it added.
 *
 *   installUncaughtErrorHandlers();                          // log-and-continue
 *   installUncaughtErrorHandlers({ exitOnUncaughtException: true }); // fail-fast
 *   process.on('uncaughtException', (e) => metrics.crash(e));        // yours too
 */
let installed: (() => void) | null = null;

export const installUncaughtErrorHandlers = (options: InstallUncaughtErrorHandlersOptions = {}): (() => void) => {
  // Idempotent: drop the previous cwip handlers (not the caller's) before re-adding.
  installed?.();

  const log = options.logger ?? defaultLogger;
  const { exitOnUncaughtException = false, exitCode = 1 } = options;

  const onException = (err: unknown) => {
    log.error('[uncaughtException]', describeError(err));
    if (exitOnUncaughtException) {
      process.exit(exitCode);
    }
  };
  const onRejection = (reason: unknown, promise: Promise<unknown>) => {
    log.error('[unhandledRejection]', { ...describeError(reason), promise });
  };

  process.on('uncaughtException', onException);
  process.on('unhandledRejection', onRejection);

  const uninstall = () => {
    process.off('uncaughtException', onException);
    process.off('unhandledRejection', onRejection);
    if (installed === uninstall) {
      installed = null;
    }
  };
  installed = uninstall;
  return uninstall;
};
