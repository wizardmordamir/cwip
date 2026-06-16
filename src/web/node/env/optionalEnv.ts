/**
 * Read an optional environment variable, falling back to `fallback` (or
 * `undefined`) when it's unset or empty. The counterpart to `requireEnv` for
 * values that have a sensible default.
 *
 *   const logLevel = optionalEnv('LOG_LEVEL', 'info'); // string
 *   const proxy = optionalEnv('HTTPS_PROXY');          // string | undefined
 */
export function optionalEnv(name: string, fallback: string): string;
export function optionalEnv(name: string, fallback?: string): string | undefined;
export function optionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value;
}

/**
 * Read a boolean-ish env var. `'1'`, `'true'`, `'yes'`, `'on'` (case-insensitive)
 * are `true`; `'0'`, `'false'`, `'no'`, `'off'`, and empty are `false`; anything
 * unset uses `fallback` (default `false`).
 *
 *   if (boolEnv('ENABLE_CACHE', true)) ...
 */
export const boolEnv = (name: string, fallback = false): boolean => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }
  return fallback;
};
