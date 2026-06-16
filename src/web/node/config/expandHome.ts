import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Expand a leading `~` / `~/` to the user's home directory and resolve to an
 * absolute path. The "paths in a config file are user-written, so honor `~`" gap
 * that `node:path` doesn't cover on its own.
 *
 *   expandHome('~/code')      // '/Users/me/code'
 *   expandHome('~')           // '/Users/me'
 *   expandHome('./rel')       // '<cwd>/rel'
 */
export const expandHome = (p: string): string => {
  if (p === '~') {
    return homedir();
  }
  if (p.startsWith('~/')) {
    return join(homedir(), p.slice(2));
  }
  return resolve(p);
};
