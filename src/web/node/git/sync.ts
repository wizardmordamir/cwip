import { dirname } from 'node:path';
import { type GitResult, git } from './git';

/**
 * Clone `url` into the absolute path `dest`. Runs from `dest`'s parent (which must
 * exist), so it works without an enclosing repo. `dest` must not already exist —
 * git refuses to clone into a non-empty dir, surfaced as a non-zero result.
 */
export const cloneRepo = async (url: string, dest: string, opts: { depth?: number } = {}): Promise<GitResult> => {
  const args = ['clone'];
  if (opts.depth) args.push('--depth', String(opts.depth));
  args.push(url, dest);
  return git(dirname(dest), args);
};

/** Fetch from origin; pass `prune` to drop remote-tracking refs deleted upstream. */
export const fetchRemote = async (repo: string, opts: { prune?: boolean } = {}): Promise<GitResult> => {
  const args = ['fetch', 'origin'];
  if (opts.prune) {
    args.push('--prune');
  }
  return git(repo, args);
};

/** Fast-forward-only pull of the current branch (also prunes). Never creates a merge. */
export const ffPull = async (repo: string): Promise<GitResult> => git(repo, ['pull', '--ff-only', '--prune']);

/**
 * Fast-forward the local `branch` ref to origin's tip *without* checking it out
 * (`git fetch origin branch:branch`). Lets you refresh, say, main while you stay
 * on a feature branch. Fails (non-zero) if it would not be a fast-forward, so it
 * never rewrites local history. The working tree is untouched.
 */
export const ffUpdateBranch = async (repo: string, branch: string): Promise<GitResult> =>
  git(repo, ['fetch', 'origin', `${branch}:${branch}`]);

/** Check out an existing branch / ref (no `-b`; fails if it doesn't exist). */
export const checkout = async (repo: string, ref: string): Promise<GitResult> => git(repo, ['checkout', ref]);

/**
 * Stage everything and commit in one step (`git add -A && git commit -m`). Useful
 * for "commit my uncommitted work before switching branches". Returns the commit
 * result; a clean tree yields a non-zero code (nothing to commit), so callers can
 * treat that as a no-op. Pass `allowEmpty` to commit even with no changes.
 */
export const commitAll = async (
  repo: string,
  message: string,
  opts: { allowEmpty?: boolean } = {},
): Promise<GitResult> => {
  const add = await git(repo, ['add', '-A']);
  if (add.code !== 0) {
    return add;
  }
  const args = ['commit', '-m', message];
  if (opts.allowEmpty) {
    args.push('--allow-empty');
  }
  return git(repo, args);
};
