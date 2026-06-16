import { resolve } from 'node:path';
import { git } from '../../web/node/git/git';

/**
 * Resolve the project root used to key the manifest. With an explicit `override`,
 * that wins (resolved to absolute). Otherwise it's the git toplevel of `startDir`
 * (via the non-throwing `git()` helper), falling back to `startDir` itself when
 * not inside a git repo — so the cache still works outside version control.
 */
export const resolveProjectRoot = async (startDir: string, override?: string): Promise<string> => {
  if (override) return resolve(override);
  const { code, stdout } = await git(startDir, ['rev-parse', '--show-toplevel']);
  const root = stdout.trim();
  return code === 0 && root ? root : resolve(startDir);
};
