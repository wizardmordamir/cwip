export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

/**
 * Soft callout colors for {@link Alert} — a tinted background, a matching border,
 * and legible text, covering light + dark mode. These are the semantic banner
 * palettes both sibling apps had hand-rolled (`border-red-…/amber bg-…-50 text-…`);
 * `neutral` falls back to the gray scale for generic notices. `info` reads as the
 * conventional sky/blue notice (the app brand `accent` is reserved for actions, not
 * status), but like every cwip component each slot is overridable per app.
 */
export const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  neutral: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
};

/** The default leading glyph for each tone, used when `icon` is `true`. Plain text
 *  glyphs (not an icon-set dependency) so cwip stays zero-runtime-dep; pass your own
 *  `icon` node to match a host app's icon set. */
export const ALERT_ICONS: Record<AlertTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
  neutral: '•',
};

/** Whether a tone defaults to the assertive `alert` live-region role (vs polite
 *  `status`). Errors and warnings interrupt; info/success/neutral are announced
 *  politely. Overridable via the component's `role` prop. */
export const ALERT_ASSERTIVE: Record<AlertTone, boolean> = {
  info: false,
  success: false,
  warning: true,
  error: true,
  neutral: false,
};
