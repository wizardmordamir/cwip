/** A local branch's tracking status against its configured upstream. */
export interface BranchTracking {
  /** Local branch short name. */
  name: string;
  /** Configured upstream short name, or `''` if the branch has none. */
  upstream: string;
  ahead: number;
  behind: number;
  /** An upstream was configured but has since been deleted on the remote. */
  gone: boolean;
}

/**
 * Parse `git for-each-ref` tracking lines (`short \t upstream-short \t
 * track(nobracket)`). The track field is git's own summary: `''` (in sync / no
 * upstream), `'gone'`, or some combination of `ahead N` / `behind N`. Pure, so
 * it's unit-testable without a real repo.
 */
export const parseBranchTracking = (text: string): BranchTracking[] => {
  const out: BranchTracking[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const [name = '', upstream = '', track = ''] = line.split('\t');
    const t = track.trim();
    const gone = t === 'gone';
    const ahead = gone ? 0 : Number(t.match(/ahead (\d+)/)?.[1] ?? 0);
    const behind = gone ? 0 : Number(t.match(/behind (\d+)/)?.[1] ?? 0);
    out.push({ name, upstream, ahead, behind, gone });
  }
  return out;
};

/** Branch names from `git branch`-style output (strips the `* `/`+ ` markers). */
export const parseBranchNames = (text: string): string[] =>
  text
    .split('\n')
    .map((s) => s.replace(/^[*+]?\s*/, '').trim())
    .filter(Boolean);

/** Branch names from `git worktree list --porcelain` (the `branch refs/heads/X` lines). */
export const parseCheckedOutBranches = (text: string): string[] => {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^branch refs\/heads\/(.+)$/);
    if (m) {
      out.push(m[1]);
    }
  }
  return out;
};

/** A branch on a remote with its tip commit's author/date. */
export interface RemoteRef {
  /** Short name without the `origin/` prefix. */
  name: string;
  /** Committer date, ISO-8601. */
  date: string;
  author: string;
  email: string;
}

/** A remote ref scored against the default branch — how far its tip has diverged. */
export interface ScoredRef extends RemoteRef {
  ahead: number;
  behind: number;
}

/**
 * Parse `for-each-ref` remote-branch lines (`%(symref) \t short \t
 * committerdate \t authorname \t authoremail`). Lines with a symref value are
 * the `origin/HEAD` pointer, not a real branch; the default branch itself is
 * also dropped (callers score other branches *against* it).
 */
export const parseRemoteRefs = (text: string, defaultBranch: string): RemoteRef[] => {
  const out: RemoteRef[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const [symref, full = '', date = '', author = '', rawEmail = ''] = line.split('\t');
    if (symref) {
      continue; // the origin/HEAD pointer, not a real branch
    }
    const name = full.replace(/^origin\//, '');
    if (name === 'HEAD' || name === defaultBranch) {
      continue;
    }
    out.push({ name, date, author, email: rawEmail.replace(/^<|>$/g, '') });
  }
  return out;
};

/** Whole-day age of an ISO date relative to `now` (negative if in the future). */
export const ageDays = (date: string, now = new Date()): number =>
  Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);

export interface RefFilter {
  /** Case-insensitive substring matched against author name or email. */
  author?: string;
  /** Case-insensitive substring matched against the branch name. */
  name?: string;
  /** Keep only refs whose tip commit predates this date. */
  before?: Date;
  /** Keep only refs whose tip is at least this many days old. */
  staleDays?: number;
  /** Keep only refs fully merged into the default branch (`ahead === 0`). */
  mergedOnly?: boolean;
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: Date;
}

/** Filter scored refs by author/name/age/merged-ness. Pure — composes with `scoredRemoteRefs`. */
export const filterRefs = <T extends ScoredRef>(refs: T[], f: RefFilter): T[] => {
  const now = f.now ?? new Date();
  return refs.filter((r) => {
    if (f.author && !`${r.author} ${r.email}`.toLowerCase().includes(f.author.toLowerCase())) {
      return false;
    }
    if (f.name && !r.name.toLowerCase().includes(f.name.toLowerCase())) {
      return false;
    }
    if (f.mergedOnly && r.ahead !== 0) {
      return false;
    }
    if (f.before && !(new Date(r.date) < f.before)) {
      return false;
    }
    if (f.staleDays != null && ageDays(r.date, now) < f.staleDays) {
      return false;
    }
    return true;
  });
};

/** A git tag with its target commit and the tagged commit's date. */
export interface GitTag {
  name: string;
  /** Short commit SHA the tag points at (the commit, deref'd for annotated tags). */
  commit: string;
  /** Committer date, ISO-8601 (empty if it couldn't be resolved). */
  date: string;
}

/**
 * Parse `for-each-ref` tag lines (`%(refname:short) \t %(objectname:short) \t
 * %(creatordate:iso8601-strict)`). Pure, so it's unit-testable without a repo.
 */
export const parseTags = (text: string): GitTag[] => {
  const out: GitTag[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const [name = '', commit = '', date = ''] = line.split('\t');
    if (name) {
      out.push({ name, commit, date });
    }
  }
  return out;
};

/** Branch names marked `: gone]` in `git branch -vv` output. */
export const parseGoneBranches = (text: string): string[] => {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    if (!/:\s*gone\]/.test(line)) {
      continue;
    }
    const name = line.replace(/^[*+]?\s*/, '').split(/\s+/)[0];
    if (name) {
      out.push(name);
    }
  }
  return out;
};
