import type { AppError } from './AppError';

/**
 * Plugin-based error instrumentation. Instead of `AppError` hard-wiring a logger
 * or an APM client (Datadog, Sentry, …), consumers register hooks that fire on
 * every `AppError` construction. This keeps the error class dependency-free and
 * the wiring app-side: register a hook at startup that ships the error wherever
 * it needs to go.
 *
 *   registerErrorHook((err) => metrics.increment('errors', { code: err.code }));
 */
export type ErrorHook = (error: AppError) => void;

const hooks: ErrorHook[] = [];

/** Register a hook fired on every `AppError`; returns an unregister function. */
export const registerErrorHook = (hook: ErrorHook): (() => void) => {
  hooks.push(hook);
  return () => {
    const i = hooks.indexOf(hook);
    if (i !== -1) {
      hooks.splice(i, 1);
    }
  };
};

/** Remove all registered error hooks (mainly for tests). */
export const clearErrorHooks = (): void => {
  hooks.length = 0;
};

/**
 * Run every registered hook for `error`. A throwing hook is swallowed — an
 * instrumentation failure must never mask the original error or break construction.
 * Called by `AppError`'s constructor; not usually called directly.
 */
export const runErrorHooks = (error: AppError): void => {
  for (const hook of hooks) {
    try {
      hook(error);
    } catch {
      // never let instrumentation throw out of error construction
    }
  }
};
