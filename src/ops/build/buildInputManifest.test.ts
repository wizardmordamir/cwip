import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInputManifest } from '.';

// node:fs/promises is outside cwip's global system mocks, so this touches the
// real filesystem (a throwaway temp tree).
let root: string;

const build = (extra: Record<string, unknown> = {}) =>
  buildInputManifest({ target: 'server', projectRoot: root, ...extra });

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cwip-buildcache-'));
  await mkdir(join(root, 'server/src'), { recursive: true });
  await mkdir(join(root, 'server/dist'), { recursive: true });
  await mkdir(join(root, 'server/test-reports.ignore'), { recursive: true });
  await mkdir(join(root, 'server/___scratch'), { recursive: true });
  await mkdir(join(root, 'server/.cache'), { recursive: true });
  await mkdir(join(root, 'shared'), { recursive: true });

  // Root-level build inputs.
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'tsconfig.json'), '{}');
  await writeFile(join(root, 'bun.lock'), 'lock');
  await writeFile(join(root, '.env'), 'A=1');

  // Target tree.
  await writeFile(join(root, 'server/src/a.ts'), 'export const a = 1;');
  await writeFile(join(root, 'server/src/b.tsx'), 'export const b = 2;');
  await writeFile(join(root, 'server/src/notes.md'), '# not an input');

  // Things that must NOT be hashed.
  await writeFile(join(root, 'server/dist/out.js'), 'built');
  await writeFile(join(root, 'server/test-reports.ignore/r.html'), '<html>');
  await writeFile(join(root, 'server/___scratch/x.ts'), 'scratch');
  await writeFile(join(root, 'server/.cache/y.ts'), 'cache');

  // Shared code, consumed by the target through a symlink.
  await writeFile(join(root, 'shared/types.ts'), 'export type T = 1;');
  await writeFile(join(root, 'shared/.DS_Store'), 'junk');
  await symlink(join(root, 'shared'), join(root, 'server/src/shared'), 'dir');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('buildInputManifest', () => {
  it('hashes the target tree + root inputs + env, by repo-root-relative key', async () => {
    const keys = Object.keys(await build());
    expect(keys).toContain('server/src/a.ts');
    expect(keys).toContain('server/src/b.tsx');
    expect(keys).toContain('package.json');
    expect(keys).toContain('tsconfig.json');
    expect(keys).toContain('bun.lock');
    expect(keys).toContain('.env');
  });

  it('excludes non-input extensions, outputs, deps, scratch, and *.ignore dirs', async () => {
    const keys = Object.keys(await build());
    expect(keys).not.toContain('server/src/notes.md');
    expect(keys.some((k) => k.startsWith('server/dist/'))).toBe(false);
    expect(keys.some((k) => k.includes('test-reports.ignore'))).toBe(false);
    expect(keys.some((k) => k.includes('___scratch'))).toBe(false);
    expect(keys.some((k) => k.includes('.cache'))).toBe(false);
  });

  it('never follows symlinks; shared code is captured only via extraDirs', async () => {
    const without = Object.keys(await build());
    expect(without.some((k) => k.startsWith('server/src/shared'))).toBe(false);
    expect(without).not.toContain('shared/types.ts');

    const withShared = Object.keys(await build({ extraDirs: ['shared'] }));
    expect(withShared).toContain('shared/types.ts');
    // Hashed once via its real path, not duplicated under the symlink.
    expect(withShared.some((k) => k.startsWith('server/src/shared'))).toBe(false);
    expect(withShared).not.toContain('shared/.DS_Store');
  });

  it('changes a file hash when its content changes', async () => {
    const before = (await build())['server/src/a.ts'];
    await writeFile(join(root, 'server/src/a.ts'), 'export const a = 999;');
    const after = (await build())['server/src/a.ts'];
    expect(after).not.toBe(before);
    await writeFile(join(root, 'server/src/a.ts'), 'export const a = 1;');
  });

  it('can omit env files', async () => {
    expect(Object.keys(await build({ envFiles: false }))).not.toContain('.env');
  });
});
