/**
 * Pure classification of browser console / page-error messages for the site smoke.
 *
 * The headline class this smoke exists to catch is the vite DEV "site will not load"
 * failure — an on-demand import-analysis error that a cached / eager production build
 * never surfaces (e.g. `Failed to resolve import "@emoji-mart/data"`, a barrel that no
 * longer exports a named symbol, a dynamically-imported route chunk that 500s). Those
 * are ALWAYS fatal (never benign-ignored) and get named specially in the heal task.
 */

/** Benign-by-default console noise a healthy app still emits (kept deliberately small). */
export const DEFAULT_IGNORE_CONSOLE = [
  'favicon',
  'failed to load resource: the server responded with a status of 404',
  // vite dev HMR websocket reconnect chatter when a server restarts under load
  '[vite] connecting...',
  '[vite] connected.',
];

/**
 * Substrings (case-insensitive) that mark a message as a vite / module-resolution
 * IMPORT failure — the "site will not load" class. Order-independent; any match wins.
 */
export const VITE_IMPORT_ERROR_PATTERNS = [
  'failed to resolve import',
  'failed to resolve module',
  'failed to resolve entry',
  'does not provide an export named',
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  '[plugin:vite:import-analysis]',
  'internal server error', // vite dev returns this for a transform/import failure
  'cannot find module',
  'module not found',
  'failed to load url',
  'rollup failed to resolve',
  'could not resolve',
  'is not exported by',
];

const norm = (s: string) => String(s).toLowerCase();

/** True when a console message matches any benign-ignore substring (case-insensitive). */
export function isIgnoredConsole(message: string, ignore: string[]): boolean {
  const m = norm(message);
  return ignore.some((p) => p && m.includes(norm(p)));
}

/** True when a message is a vite / module-resolution import failure (always fatal). */
export function isViteImportError(message: string): boolean {
  const m = norm(message);
  return VITE_IMPORT_ERROR_PATTERNS.some((p) => m.includes(p));
}

/** The first message in `messages` that is a vite/import error, or `undefined`. */
export function firstImportError(messages: string[]): string | undefined {
  return messages.find((m) => isViteImportError(m));
}
