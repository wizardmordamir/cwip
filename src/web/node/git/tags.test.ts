import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listTags, tagCommit } from '.';

// Integration against a real temp repo — tags need actual git objects, which the
// virtualized-fs unit mocks can't provide. Uses node:fs/promises (NOT virtualized
// by the test preload, unlike node:fs) so the files reach real disk for git.
const setup = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'cwip-tags-'));
  const g = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' });
  g('init', '-q');
  g('config', 'user.email', 't@t.io');
  g('config', 'user.name', 'T');
  g('config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'f.txt'), 'hi');
  g('add', '.');
  g('commit', '-q', '-m', 'first');
  return dir;
};

describe('tags', () => {
  it('tagCommit creates tags and listTags returns them', async () => {
    const dir = await setup();
    try {
      expect((await tagCommit(dir, 'v1.0.0')).code).toBe(0);
      expect((await tagCommit(dir, 'v1.1.0', { message: 'release' })).code).toBe(0);
      expect((await tagCommit(dir, 'rc-1')).code).toBe(0);

      const all = await listTags(dir);
      const names = all.map((t) => t.name);
      expect(names).toContain('v1.0.0');
      expect(names).toContain('v1.1.0');
      expect(names).toContain('rc-1');
      // Each carries a short commit SHA and an ISO date.
      expect(all[0].commit).toMatch(/^[0-9a-f]{7,}$/);
      expect(all[0].date).toMatch(/^\d{4}-\d\d-\d\d/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('listTags filters by prefix and honors limit', async () => {
    const dir = await setup();
    try {
      await tagCommit(dir, 'v1.0.0');
      await tagCommit(dir, 'v2.0.0');
      await tagCommit(dir, 'rc-1');

      const vTags = await listTags(dir, { prefix: 'v' });
      expect(vTags.map((t) => t.name).sort()).toEqual(['v1.0.0', 'v2.0.0']);

      expect((await listTags(dir, { limit: 1 })).length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a duplicate tag fails (non-zero) unless forced', async () => {
    const dir = await setup();
    try {
      expect((await tagCommit(dir, 'dup')).code).toBe(0);
      expect((await tagCommit(dir, 'dup')).code).not.toBe(0);
      expect((await tagCommit(dir, 'dup', { force: true })).code).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
