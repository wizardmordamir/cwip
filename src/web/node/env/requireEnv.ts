/**
 * Read a required environment variable, throwing a clear error when it's missing
 * or empty. Use at startup so a misconfigured process fails loudly and early
 * rather than with a confusing downstream error.
 *
 *   const dbUrl = requireEnv('DATABASE_URL');
 *   const port = requireEnv('PORT', { hint: 'set it in .env' });
 */
export interface RequireEnvOptions {
  /** Treat a present-but-empty/whitespace value as missing (default `true`). */
  rejectEmpty?: boolean;
  /** Extra guidance appended to the error message. */
  hint?: string;
}

export const requireEnv = (name: string, options: RequireEnvOptions = {}): string => {
  const value = process.env[name];
  const rejectEmpty = options.rejectEmpty ?? true;
  if (value === undefined || (rejectEmpty && value.trim() === '')) {
    const hint = options.hint ? ` ${options.hint}` : '';
    throw new Error(`Missing required environment variable ${name}.${hint}`);
  }
  return value;
};
