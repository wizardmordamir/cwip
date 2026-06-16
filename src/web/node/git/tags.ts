import { type GitResult, git } from './git';
import { type GitTag, parseTags } from './parseGit';

export interface ListTagsOptions {
  /** Only tags whose name starts with this (case-sensitive) prefix. */
  prefix?: string;
  /** Cap the result (newest first). */
  limit?: number;
}

/**
 * Tags in the repo with their target commit + date, newest first (by creator
 * date). `prefix` filters by name via git's own pattern match (so it's cheap on
 * huge tag sets); `limit` caps the count. Annotated tags are dereferenced to the
 * commit they point at.
 */
export const listTags = async (repo: string, opts: ListTagsOptions = {}): Promise<GitTag[]> => {
  const fmt = '%(refname:short)\t%(objectname:short)\t%(creatordate:iso8601-strict)';
  const args = ['for-each-ref', '--sort=-creatordate', `--format=${fmt}`];
  args.push(opts.prefix ? `refs/tags/${opts.prefix}*` : 'refs/tags');
  if (opts.limit && opts.limit > 0) {
    args.push(`--count=${Math.floor(opts.limit)}`);
  }
  return parseTags((await git(repo, args)).stdout);
};

/**
 * Create a tag. Lightweight by default; pass `message` for an annotated tag.
 * `ref` is what to tag (commit/branch/ref), defaulting to HEAD. Returns the raw
 * `GitResult` so callers can branch on `code` (e.g. tag already exists → non-zero).
 */
export const tagCommit = async (
  repo: string,
  name: string,
  opts: { ref?: string; message?: string; force?: boolean } = {},
): Promise<GitResult> => {
  const args = ['tag'];
  if (opts.force) {
    args.push('--force');
  }
  if (opts.message) {
    args.push('--annotate', '--message', opts.message);
  }
  args.push(name);
  if (opts.ref) {
    args.push(opts.ref);
  }
  return git(repo, args);
};
