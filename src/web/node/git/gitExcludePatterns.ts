import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { expandHome } from '../config';
import { git } from './git';

const readLines = async (file: string): Promise<string[]> => {
  try {
    return (await readFile(file, 'utf8')).split(/\r?\n/);
  } catch {
    return []; // missing/unreadable — no patterns
  }
};

/**
 * Patterns from git's non-`.gitignore` exclude sources for `repo`, in git's
 * precedence order (weakest first): the global `core.excludesFile` (or its XDG
 * default `~/.config/git/ignore`), then `$GIT_DIR/info/exclude`. Useful for
 * making "what a tool walks/indexes" track what git itself ignores — editing the
 * global ignore changes behavior with no code change. Returns `[]` when git is
 * absent; `info/exclude` is skipped for non-repos.
 */
export const gitExcludePatterns = async (repo: string): Promise<string[]> => {
  const lines: string[] = [];
  try {
    const cfg = await git(repo, ['config', '--get', 'core.excludesFile']);
    let excludesFile = cfg.code === 0 ? cfg.stdout.trim() : '';
    if (!excludesFile) {
      const xdg = process.env.XDG_CONFIG_HOME?.trim();
      excludesFile = join(xdg || join(homedir(), '.config'), 'git', 'ignore');
    }
    lines.push(...(await readLines(expandHome(excludesFile))));

    // info/exclude wins over the global file (later == higher precedence in one layer).
    const p = await git(repo, ['rev-parse', '--git-path', 'info/exclude']);
    const infoPath = p.stdout.trim();
    if (p.code === 0 && infoPath) {
      lines.push(...(await readLines(isAbsolute(infoPath) ? infoPath : resolve(repo, infoPath))));
    }
  } catch {
    // git binary missing — fall back to no extra excludes
  }
  return lines;
};
