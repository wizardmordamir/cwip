import { git } from './git';

/** Whether `path` is inside a git work tree. */
export const isGitRepo = async (path: string): Promise<boolean> => {
  const r = await git(path, ['rev-parse', '--is-inside-work-tree']);
  return r.code === 0 && r.stdout.trim() === 'true';
};

/** The current branch short name (`HEAD` when detached). */
export const currentBranch = async (repo: string): Promise<string> =>
  (await git(repo, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();

/** The repo's default branch: `origin/HEAD` if set, else `main`/`master`, else `'main'`. */
export const defaultBranch = async (repo: string): Promise<string> => {
  const head = await git(repo, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  if (head.code === 0 && head.stdout.trim()) {
    return head.stdout.trim().replace(/^origin\//, '');
  }
  for (const b of ['main', 'master']) {
    if ((await git(repo, ['rev-parse', '--verify', '--quiet', b])).code === 0) {
      return b;
    }
  }
  return 'main';
};

/** Changed/untracked entries from `git status --porcelain` (one per line). */
export const statusEntries = async (repo: string): Promise<string[]> => {
  const r = await git(repo, ['status', '--porcelain']);
  return r.stdout
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean);
};

/** Whether the work tree has any staged, unstaged, or untracked changes. */
export const hasUncommittedChanges = async (repo: string): Promise<boolean> => (await statusEntries(repo)).length > 0;

/** Commits ahead of / behind the upstream, or `null` when there's no upstream. */
export const aheadBehind = async (repo: string): Promise<{ ahead: number; behind: number } | null> => {
  const r = await git(repo, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']);
  if (r.code !== 0) {
    return null;
  }
  const [behind, ahead] = r.stdout.trim().split(/\s+/).map(Number);
  return { ahead: ahead || 0, behind: behind || 0 };
};

/** Commits `tip` is ahead of / behind `base` (e.g. base `'origin/main'`, tip `'feat/x'`). */
export const aheadBehindRefs = async (
  repo: string,
  base: string,
  tip: string,
): Promise<{ ahead: number; behind: number }> => {
  const r = await git(repo, ['rev-list', '--left-right', '--count', `${base}...${tip}`]);
  if (r.code !== 0) {
    return { ahead: 0, behind: 0 };
  }
  const [behind, ahead] = r.stdout.trim().split(/\s+/).map(Number);
  return { ahead: ahead || 0, behind: behind || 0 };
};

/**
 * Approximate "when this branch was created": the author date (strict ISO 8601) of
 * the earliest commit reachable from `branch` but not from `base`. Git records no
 * branch-creation event, so the first commit that diverged from the base is the
 * best available signal. Returns null when `branch` has no commits beyond `base`
 * (it's even with or behind it — e.g. the default branch compared to itself) or on
 * error.
 */
export const branchCreatedAt = async (repo: string, branch: string, base: string): Promise<string | null> => {
  const r = await git(repo, ['log', '--reverse', '--format=%aI', `${base}..${branch}`]);
  if (r.code !== 0) {
    return null;
  }
  const first = r.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)[0];
  return first ?? null;
};

/** True if `ref` resolves to a commit in this repo (e.g. `'origin/main'`). */
export const refExists = async (repo: string, ref: string): Promise<boolean> =>
  (await git(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])).code === 0;

/** Number of stash entries. */
export const stashCount = async (repo: string): Promise<number> =>
  (await git(repo, ['stash', 'list'])).stdout.split('\n').filter(Boolean).length;

/** The `origin` remote URL, or null when there's no origin (or it errors). */
export const remoteUrl = async (repo: string, remote = 'origin'): Promise<string | null> => {
  const r = await git(repo, ['remote', 'get-url', remote]);
  const url = r.stdout.trim();
  return r.code === 0 && url ? url : null;
};
