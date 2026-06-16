/**
 * The human-readable message of an unknown thrown value — message only, no
 * stack, browser-safe. The UI-facing counterpart of `getMessageFromError`,
 * which is log-oriented and appends a cleaned stack trace for most errors;
 * use this one for toasts, form errors, and anything user-visible.
 *
 *   try { ... } catch (err) { toast.error(getErrorMessage(err)); }
 */
export const getErrorMessage = (error: unknown): string => {
  if (error === null || error === undefined) {
    return '';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
