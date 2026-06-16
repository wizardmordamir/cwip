import { readFileSync } from 'node:fs';
import { parseEnvText } from '../../../data/env';

// Re-export the (browser-safe) parser from the shared env core so `cwip/node`
// consumers keep getting `parseEnvText` from here, while there is a single
// implementation of it (see src/data/env).
export { parseEnvText };

/**
 * Parse a dotenv-style file (`KEY=value` lines, `#` comments, optional `export `
 * prefix, single/double-quoted values unwrapped) into a key→value map. The file
 * is read once and cached per path — call `clearEnvFileCache` to force a re-read
 * (tests, watch loops). A missing or unreadable file yields `{}` rather than
 * throwing, so "no env file yet" is a normal state.
 *
 * This loads the file *as data* and does NOT mutate `process.env` — compose it
 * with your own lookup order, e.g. `process.env[name] ?? loadEnvFile(path)[name]`.
 *
 *   const secrets = loadEnvFile('~/.myapp/.env'); // (expand the path yourself)
 *   const token = process.env.API_TOKEN ?? secrets.API_TOKEN;
 */
const cache = new Map<string, Record<string, string>>();

export const loadEnvFile = (path: string): Record<string, string> => {
  const cached = cache.get(path);
  if (cached) {
    return cached;
  }
  let parsed: Record<string, string>;
  try {
    parsed = parseEnvText(readFileSync(path, 'utf8'));
  } catch {
    parsed = {}; // no file yet — treat as empty
  }
  cache.set(path, parsed);
  return parsed;
};

/** Drop the cached contents for `path` (or every path when omitted). */
export const clearEnvFileCache = (path?: string): void => {
  if (path === undefined) {
    cache.clear();
  } else {
    cache.delete(path);
  }
};
