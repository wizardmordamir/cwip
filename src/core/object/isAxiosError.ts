/**
 * True for an Axios-style error — one carrying a `response` (an HTTP error Axios
 * attaches the upstream response to) or the `isAxiosError` flag Axios stamps on
 * its errors.
 *
 * Null-safe: a nullish or primitive argument is simply not an Axios error
 * (returns `false`) instead of throwing, matching the guarding in
 * {@link isNetworkError}. Without the guard, `isAxiosError(undefined)` threw a
 * `TypeError` reading `.response` — and this is called from `showStackForError`
 * during error formatting, exactly when a defined error isn't guaranteed.
 */
export const isAxiosError = (err) => !!err && (!!err.response || err.isAxiosError === true);
