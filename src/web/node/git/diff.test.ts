import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffNameStatus, discardAll, discardPaths, fileDiff, parseStatusPorcelain, stashPush } from '.';

describe('parseStatusPorcelain', () => {
  it('maps codes to statuses, flags untracked, and uses a rename new-path', () => {
    const out = parseStatusPorcelain(
      [' M src/a.ts', 'A  src/b.ts', ' D old.ts', '?? note.txt', 'R  x.ts -> y.ts'].join('\n'),
    );
    expect(out).toEqual([
      { path: 'src/a.ts', status: 'modified', untracked: false },
      { path: 'src/b.ts', status: 'added', untracked: false },
      { path: 'old.ts', status: 'deleted', untracked: false },
      { path: 'note.txt', status: 'untracked', untracked: true },
      { path: 'y.ts', status: 'renamed', untracked: false },
    ]);
  });

  it('ignores blank/too-short lines', () => {
    expect(parseStatusPorcelain('\n  \nM')).toEqual([]);
  });
});

const setup = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'cwip-diff-'));
  const g = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@t.io');
  g('config', 'user.name', 'T');
  g('config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'tracked.txt'), 'one\n');
  g('add', '.');
  g('commit', '-q', '-m', 'first');
  return dir;
};

describe('diffNameStatus / fileDiff', () => {
  it('lists tracked edits + untracked files and diffs each', async () => {
    const dir = await setup();
    try {
      await writeFile(join(dir, 'tracked.txt'), 'one\ntwo\n'); // modify
      await writeFile(join(dir, 'fresh.txt'), 'brand new\n'); // untracked

      const files = await diffNameStatus(dir);
      const byPath = Object.fromEntries(files.map((f) => [f.path, f]));
      expect(byPath['tracked.txt']).toMatchObject({ status: 'modified', untracked: false });
      expect(byPath['fresh.txt']).toMatchObject({ status: 'untracked', untracked: true });

      expect(await fileDiff(dir, 'tracked.txt')).toContain('+two');
      expect(await fileDiff(dir, 'fresh.txt', { untracked: true })).toContain('+brand new');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('discardPaths / discardAll / stashPush', () => {
  it('discardPaths reverts a tracked edit and removes an untracked file', async () => {
    const dir = await setup();
    try {
      await writeFile(join(dir, 'tracked.txt'), 'changed\n');
      await writeFile(join(dir, 'junk.txt'), 'x\n');
      await discardPaths(dir, ['tracked.txt', 'junk.txt']);
      expect(await diffNameStatus(dir)).toEqual([]); // clean tree
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('stashPush then discardAll both clear the working tree', async () => {
    const dir = await setup();
    try {
      await writeFile(join(dir, 'tracked.txt'), 'edited\n');
      await writeFile(join(dir, 'extra.txt'), 'untracked\n');
      expect((await stashPush(dir, { message: 'wip' })).code).toBe(0);
      expect(await diffNameStatus(dir)).toEqual([]); // stash cleared it (incl. untracked)

      // Re-dirty, then hard-discard everything.
      await writeFile(join(dir, 'tracked.txt'), 'again\n');
      await writeFile(join(dir, 'more.txt'), 'y\n');
      await discardAll(dir);
      expect(await diffNameStatus(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
