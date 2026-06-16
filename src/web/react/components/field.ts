// Shared form-field styling defaults used by Input / Select / TextArea. Visual
// (Tailwind-first), light + dark, with a themeable `accent` focus ring (defaults
// to emerald — see ./theme.css). `text-base sm:text-sm` keeps inputs at 16px on
// mobile so iOS Safari doesn't auto-zoom on focus, 14px on larger screens.
// Override per component via the styling system (classNames/styles).
export const FIELD_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 sm:text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500';

// Same field style without `w-full`, for selects / fixed-width controls inside a
// flex row that set their own width (with `w-full` they'd stretch and squeeze siblings).
export const FIELD_CLASS_AUTO = FIELD_CLASS.replace('w-full ', '');

/**
 * Attributes that tell the browser's autofill bar and the major password managers
 * (1Password / LastPass / Bitwarden …) to leave a field alone. On desktop these
 * inject an inline overlay onto identity-looking inputs ("First name"/"Last name")
 * that can swallow the click — the user sees no caret and can't type. Spread onto
 * any non-credential text field to suppress that.
 */
export const SUPPRESS_AUTOFILL_PROPS = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-form-type': 'other',
} as const;
