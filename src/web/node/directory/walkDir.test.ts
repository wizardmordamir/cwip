import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { walkDir } from '.';

// node:fs/promises is intentionally outside cwip's global system mocks, so these
// operations hit the real filesystem.
let root: string;

const rel = (paths: string[]) => paths.map((p) => relative(root, p)).sort();

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cwip-walkdir-'));
  await mkdir(join(root, 'src/inner'), { recursive: true });
  await mkdir(join(root, 'node_modules/pkg'), { recursive: true });
  await mkdir(join(root, 'real'), { recursive: true });

  await writeFile(join(root, 'index.ts'), '');
  await writeFile(join(root, 'src/a.ts'), '');
  await writeFile(join(root, 'src/inner/b.ts'), '');
  await writeFile(join(root, 'src/debug.log'), '');
  await writeFile(join(root, 'node_modules/pkg/dep.ts'), '');
  await writeFile(join(root, 'real/linked.ts'), '');

  // A symlink to a directory, to exercise followSymlinks.
  await symlink(join(root, 'real'), join(root, 'src/linkedDir'), 'dir');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('walkDir', () => {
  it('recursively lists every file with ignore-lists applied', async () => {
    const files = await walkDir(root, {
      ignoreDirs: ['node_modules'],
      ignoreFiles: ['*.log'],
      followSymlinks: false,
    });

    expect(rel(files)).toEqual(['index.ts', 'real/linked.ts', 'src/a.ts', 'src/inner/b.ts']);
  });

  it('returns deterministic, sorted output', async () => {
    const a = await walkDir(root, { ignoreDirs: ['node_modules'], followSymlinks: false });
    const b = await walkDir(root, { ignoreDirs: ['node_modules'], followSymlinks: false });
    expect(a).toEqual(b);
  });

  it('follows directory symlinks when enabled', async () => {
    const files = await walkDir(root, {
      ignoreDirs: ['node_modules'],
      ignoreFiles: ['*.log'],
      followSymlinks: true,
    });
    expect(rel(files)).toContain('src/linkedDir/linked.ts');
  });

  it('does not follow symlinks when disabled', async () => {
    const files = await walkDir(root, { ignoreDirs: ['node_modules'], followSymlinks: false });
    expect(rel(files)).not.toContain('src/linkedDir/linked.ts');
  });

  it('reports unreadable directories via onError instead of throwing', async () => {
    const errors: string[] = [];
    const files = await walkDir(join(root, 'does-not-exist'), {
      onError: (_err, path) => errors.push(path),
    });
    expect(files).toEqual([]);
    expect(errors.length).toBe(1);
  });
});
