import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInputManifest, checkBuildCache, resolveManifestPath, saveManifest } from '.';

let root: string;
const manifestDir = () => join(root, '__manifests');
const opts = (target: string) => ({ target, projectRoot: root, manifestDir: manifestDir() });

const saveCurrent = async (target: string) => {
  await saveManifest(await resolveManifestPath(opts(target)), await buildInputManifest(opts(target)));
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cwip-check-'));
  await mkdir(join(root, 'server/src'), { recursive: true });
  await mkdir(join(root, 'server/dist'), { recursive: true });
  await mkdir(join(root, 'ui/src'), { recursive: true }); // no dist on purpose
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'server/src/a.ts'), 'export const a = 1;');
  await writeFile(join(root, 'server/dist/out.js'), 'built');
  await writeFile(join(root, 'ui/src/x.ts'), 'export const x = 1;');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('checkBuildCache', () => {
  it('is not fresh when the output dir is missing (rebuild regardless of hashes)', async () => {
    const status = await checkBuildCache(opts('ui'));
    expect(status).toMatchObject({ fresh: false, reason: 'no-output' });
  });

  it('is not fresh when there is no saved manifest', async () => {
    await rm(manifestDir(), { recursive: true, force: true });
    const status = await checkBuildCache(opts('server'));
    expect(status).toMatchObject({ fresh: false, reason: 'no-manifest' });
  });

  it('is fresh when inputs match the saved manifest', async () => {
    await saveCurrent('server');
    const status = await checkBuildCache(opts('server'));
    expect(status).toMatchObject({ fresh: true, reason: 'unchanged' });
  });

  it('is not fresh and reports the changed file when an input changes', async () => {
    await saveCurrent('server');
    await writeFile(join(root, 'server/src/a.ts'), 'export const a = 2;');
    const status = await checkBuildCache(opts('server'));
    expect(status.fresh).toBe(false);
    expect(status.reason).toBe('changed');
    expect(status.diff.changed).toContain('server/src/a.ts');
    await writeFile(join(root, 'server/src/a.ts'), 'export const a = 1;');
  });
});
