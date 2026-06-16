import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aheadBehindRefs, branchCreatedAt, currentBranch, git, isGitRepo, remoteUrl, statusEntries } from '.';

// node:child_process is not part of cwip's system mocks, so these run real git
// against this very repo (the test file lives inside it).
const repo = import.meta.dir;

describe('git (runner)', () => {
  it('runs a command and returns code 0 with output', async () => {
    const r = await git(repo, ['rev-parse', '--is-inside-work-tree']);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe('true');
  });

  it('returns a non-zero code instead of throwing on failure', async () => {
    const r = await git(repo, ['rev-parse', 'definitely-not-a-ref']);
    expect(r.code).not.toBe(0);
  });
});

describe('isGitRepo', () => {
  it('is true inside a repo and false outside', async () => {
    expect(await isGitRepo(repo)).toBe(true);
    expect(await isGitRepo(tmpdir())).toBe(false);
  });
});

describe('currentBranch / statusEntries', () => {
  it('returns a branch name and an array of porcelain entries', async () => {
    expect(typeof (await currentBranch(repo))).toBe('string');
    expect((await currentBranch(repo)).length).toBeGreaterThan(0);
    expect(Array.isArray(await statusEntries(repo))).toBe(true);
  });
});

// A real temp repo: main with one commit, a feature branch with two more, so we
// can assert divergence math. (node:fs/promises reaches real disk — git needs it.)
const setupDiverged = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'cwip-gitinfo-'));
  const g = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@t.io');
  g('config', 'user.name', 'T');
  g('config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'f.txt'), 'base');
  g('add', '.');
  g('commit', '-q', '-m', 'base');
  g('checkout', '-q', '-b', 'feat');
  await writeFile(join(dir, 'f.txt'), 'one');
  g('commit', '-q', '-am', 'one');
  await writeFile(join(dir, 'f.txt'), 'two');
  g('commit', '-q', '-am', 'two');
  return dir;
};

describe('aheadBehindRefs', () => {
  it('counts commits a tip is ahead of / behind a base', async () => {
    const dir = await setupDiverged();
    try {
      expect(await aheadBehindRefs(dir, 'main', 'feat')).toEqual({ ahead: 2, behind: 0 });
      expect(await aheadBehindRefs(dir, 'feat', 'main')).toEqual({ ahead: 0, behind: 2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns zeros for a bad ref instead of throwing', async () => {
    const dir = await setupDiverged();
    try {
      expect(await aheadBehindRefs(dir, 'main', 'no-such-branch')).toEqual({ ahead: 0, behind: 0 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('remoteUrl', () => {
  it('returns the origin url when set, else null', async () => {
    const dir = await setupDiverged();
    try {
      expect(await remoteUrl(dir)).toBeNull(); // no origin yet
      execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', 'https://example.com/x.git'], { stdio: 'pipe' });
      expect(await remoteUrl(dir)).toBe('https://example.com/x.git');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('branchCreatedAt', () => {
  it('returns the ISO date of the earliest commit diverging from the base', async () => {
    const dir = await setupDiverged();
    try {
      const date = await branchCreatedAt(dir, 'feat', 'main');
      expect(date).toMatch(/^\d{4}-\d\d-\d\dT/); // strict ISO 8601
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns null when the branch has no commits beyond the base', async () => {
    const dir = await setupDiverged();
    try {
      // main vs feat: main is behind, so it has nothing beyond feat.
      expect(await branchCreatedAt(dir, 'main', 'feat')).toBeNull();
      // A branch compared to itself diverges by nothing.
      expect(await branchCreatedAt(dir, 'feat', 'feat')).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
