import { git } from './git';
import { aheadBehindRefs, defaultBranch, refExists } from './gitInfo';
import {
  type BranchTracking,
  parseBranchNames,
  parseBranchTracking,
  parseCheckedOutBranches,
  parseGoneBranches,
  parseRemoteRefs,
  type RemoteRef,
  type ScoredRef,
} from './parseGit';
import { fetchRemote } from './sync';

/** Local branch names (short), in `for-each-ref` order. */
export const localBranches = async (repo: string): Promise<string[]> =>
  parseBranchNames((await git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])).stdout);

/**
 * Every local branch with its upstream tracking (ahead/behind/gone), resolved in
 * a single `for-each-ref`. Numbers reflect the last fetch of the remote-tracking
 * refs — fetch first if you need them current.
 */
export const branchTracking = async (repo: string): Promise<BranchTracking[]> => {
  const fmt = '%(refname:short)\t%(upstream:short)\t%(upstream:track,nobracket)';
  return parseBranchTracking((await git(repo, ['for-each-ref', `--format=${fmt}`, 'refs/heads'])).stdout);
};

/** Short names of branches on origin (without the `origin/` prefix; excludes `origin/HEAD`). */
export const remoteBranchSet = async (repo: string): Promise<Set<string>> => {
  const r = await git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin']);
  const out = new Set<string>();
  for (const line of r.stdout.split('\n')) {
    const name = line.trim().replace(/^origin\//, '');
    if (name && name !== 'HEAD') {
      out.add(name);
    }
  }
  return out;
};

/** Origin branches with tip metadata, oldest first. Reads remote-tracking refs (fetch first to refresh). */
export const remoteRefs = async (repo: string, defaultBranchName: string): Promise<RemoteRef[]> => {
  // Leading %(symref) flags the origin/HEAD pointer so the parser can drop it.
  const fmt = '%(symref)\t%(refname:short)\t%(committerdate:iso8601-strict)\t%(authorname)\t%(authoremail)';
  const r = await git(repo, ['for-each-ref', '--sort=committerdate', `--format=${fmt}`, 'refs/remotes/origin']);
  return parseRemoteRefs(r.stdout, defaultBranchName);
};

/**
 * Fetch origin (pruning), then list its branches scored ahead/behind against the
 * default branch. Always refreshes so callers see current state; the per-branch
 * scoring runs in parallel. `base` is `origin/<default>` when present, else local.
 */
export const scoredRemoteRefs = async (repo: string): Promise<{ base: string; refs: ScoredRef[] }> => {
  await fetchRemote(repo, { prune: true });
  const def = await defaultBranch(repo);
  const base = (await refExists(repo, `origin/${def}`)) ? `origin/${def}` : def;
  const refs = await Promise.all(
    (await remoteRefs(repo, def)).map(async (ref) => ({
      ...ref,
      ...(await aheadBehindRefs(repo, base, `origin/${ref.name}`)),
    })),
  );
  return { base, refs };
};

/** Local branches merged into `into` (excluding `into` itself). */
export const mergedBranches = async (repo: string, into: string): Promise<string[]> => {
  const r = await git(repo, ['branch', '--merged', into, '--format=%(refname:short)']);
  return parseBranchNames(r.stdout).filter((b) => b !== into);
};

/** Local branches whose upstream is gone (deleted on the remote). */
export const goneBranches = async (repo: string): Promise<string[]> =>
  parseGoneBranches((await git(repo, ['branch', '-vv'])).stdout);

/** Branches currently checked out in any worktree (git refuses to delete these). */
export const checkedOutBranches = async (repo: string): Promise<Set<string>> =>
  new Set(parseCheckedOutBranches((await git(repo, ['worktree', 'list', '--porcelain'])).stdout));
