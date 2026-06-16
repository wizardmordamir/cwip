import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkout, cloneRepo, commitAll, currentBranch } from '.';

// A real temp repo on `main` with one commit (node:fs/promises reaches real disk).
const setup = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'cwip-sync-'));
  const g = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@t.io');
  g('config', 'user.name', 'T');
  g('config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'f.txt'), 'one');
  g('add', '.');
  g('commit', '-q', '-m', 'first');
  return dir;
};

describe('cloneRepo', () => {
  it('clones a (local) source repo into a fresh dest, and fails on a non-empty dest', async () => {
    const src = await setup();
    const parent = await mkdtemp(join(tmpdir(), 'cwip-clone-'));
    const dest = join(parent, 'cloned');
    try {
      const r = await cloneRepo(src, dest);
      expect(r.code).toBe(0);
      // The clone has the source's commit (HEAD resolves).
      expect(await currentBranch(dest)).toBeTruthy();
      // Cloning again into the now-existing dest fails (git won't overwrite).
      expect((await cloneRepo(src, dest)).code).not.toBe(0);
    } finally {
      await rm(src, { recursive: true, force: true });
      await rm(parent, { recursive: true, force: true });
    }
  });
});

describe('checkout', () => {
  it('switches to an existing branch and fails for a missing one', async () => {
    const dir = await setup();
    try {
      execFileSync('git', ['-C', dir, 'branch', 'feature'], { stdio: 'pipe' });
      expect((await checkout(dir, 'feature')).code).toBe(0);
      expect(await currentBranch(dir)).toBe('feature');
      expect((await checkout(dir, 'no-such-branch')).code).not.toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('commitAll', () => {
  it('stages + commits all changes', async () => {
    const dir = await setup();
    try {
      await writeFile(join(dir, 'f.txt'), 'two');
      await writeFile(join(dir, 'new.txt'), 'added');
      expect((await commitAll(dir, 'wip')).code).toBe(0);
      // Tree is now clean.
      const status = execFileSync('git', ['-C', dir, 'status', '--porcelain'], { encoding: 'utf8' });
      expect(status.trim()).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a clean tree is a non-zero no-op unless allowEmpty', async () => {
    const dir = await setup();
    try {
      expect((await commitAll(dir, 'nothing')).code).not.toBe(0); // nothing to commit
      expect((await commitAll(dir, 'empty', { allowEmpty: true })).code).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
