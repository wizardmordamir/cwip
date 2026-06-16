import { type GitResult, git } from './git';

export type DiffStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';

export interface DiffFile {
  /** Path relative to the repo root (the new path for a rename). */
  path: string;
  status: DiffStatus;
  /** Untracked files have no committed baseline to diff against HEAD. */
  untracked: boolean;
}

const statusFor = (code: string): DiffStatus => {
  if (code === 'A') return 'added';
  if (code === 'D') return 'deleted';
  if (code === 'R') return 'renamed';
  return 'modified';
};

/**
 * Parse `git status --porcelain` (v1) into a flat changed-file list. Each line is
 * `XY <path>` (or `?? <path>` for untracked, `R  old -> new` for a rename). We key
 * on the first non-space of the XY code; a rename reports its new path. Pure, so
 * it's unit-tested without a repo.
 */
export const parseStatusPorcelain = (text: string): DiffFile[] => {
  const out: DiffFile[] = [];
  for (const line of text.split('\n')) {
    if (line.length < 4) continue;
    const xy = line.slice(0, 2);
    let path = line.slice(3);
    if (xy === '??') {
      out.push({ path, status: 'untracked', untracked: true });
      continue;
    }
    const arrow = path.indexOf(' -> ');
    if (arrow >= 0) path = path.slice(arrow + 4); // rename: keep the new path
    const code = xy.trim()[0] ?? 'M';
    out.push({ path, status: statusFor(code), untracked: false });
  }
  return out;
};

/** The repo's uncommitted changes (staged, unstaged, and untracked), newest API. */
export const diffNameStatus = async (repo: string): Promise<DiffFile[]> =>
  parseStatusPorcelain((await git(repo, ['status', '--porcelain'])).stdout);

/**
 * A unified diff for one path. Tracked files diff against HEAD (so it shows staged
 * + unstaged together); an untracked file is shown as an all-additions diff via
 * `--no-index` (which exits non-zero when files differ — expected, so the stdout
 * is returned regardless).
 */
export const fileDiff = async (repo: string, path: string, opts: { untracked?: boolean } = {}): Promise<string> => {
  if (opts.untracked) {
    const r = await git(repo, ['diff', '--no-index', '--', '/dev/null', path]);
    return r.stdout;
  }
  return (await git(repo, ['diff', 'HEAD', '--', path])).stdout;
};

/** Stash all changes (includes untracked by default). */
export const stashPush = async (
  repo: string,
  opts: { message?: string; includeUntracked?: boolean } = {},
): Promise<GitResult> => {
  const args = ['stash', 'push'];
  if (opts.includeUntracked !== false) args.push('--include-untracked');
  if (opts.message) args.push('-m', opts.message);
  return git(repo, args);
};

/**
 * Discard changes to specific paths: restore tracked files to HEAD (unstaging +
 * reverting the worktree) and remove any untracked ones. Both run best-effort so a
 * mixed selection is fully cleared.
 */
export const discardPaths = async (repo: string, paths: string[]): Promise<GitResult> => {
  if (paths.length === 0) return { code: 0, stdout: '', stderr: '' };
  // Restore per-path: `git restore` validates ALL pathspecs first, so one
  // untracked path (which it can't restore) would abort the whole batch. Doing
  // them one at a time reverts each tracked file regardless of the others.
  for (const p of paths) {
    await git(repo, ['restore', '--staged', '--worktree', '--', p]);
  }
  return git(repo, ['clean', '-fd', '--', ...paths]);
};

/** Discard ALL uncommitted changes: hard reset + remove untracked files/dirs. */
export const discardAll = async (repo: string): Promise<GitResult> => {
  await git(repo, ['reset', '--hard']);
  return git(repo, ['clean', '-fd']);
};
