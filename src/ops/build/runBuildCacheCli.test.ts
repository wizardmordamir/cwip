import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveManifestPath, runBuildCacheCli } from '.';

let root: string;
let config: { projectRoot: string; manifestDir: string };

const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cwip-cli-'));
  config = { projectRoot: root, manifestDir: join(root, '__manifests') };
  await mkdir(join(root, 'server/src'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'server/src/a.ts'), 'export const a = 1;');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('runBuildCacheCli', () => {
  it('returns 2 for a missing or unknown verb', async () => {
    expect(await runBuildCacheCli(config, [])).toBe(2);
    expect(await runBuildCacheCli(config, ['bogus', 'server'])).toBe(2);
    expect(await runBuildCacheCli(config, ['check'])).toBe(2); // verb without a dir
  });

  it('check returns 1 when there is no build output yet', async () => {
    expect(await runBuildCacheCli(config, ['check', 'server'])).toBe(1);
  });

  it('full lifecycle: build → save → check(skip) → change → check(build) → clean', async () => {
    // Pretend the build ran: create the output dir.
    await mkdir(join(root, 'server/dist'), { recursive: true });
    await writeFile(join(root, 'server/dist/out.js'), 'built');

    // No manifest yet → build needed.
    expect(await runBuildCacheCli(config, ['check', 'server'])).toBe(1);

    // Save, then an unchanged check skips.
    expect(await runBuildCacheCli(config, ['save', 'server'])).toBe(0);
    expect(await exists(await resolveManifestPath({ ...config, target: 'server' }))).toBe(true);
    expect(await runBuildCacheCli(config, ['check', 'server'])).toBe(0);

    // An input change busts it.
    await writeFile(join(root, 'server/src/a.ts'), 'export const a = 2;');
    expect(await runBuildCacheCli(config, ['check', 'server'])).toBe(1);

    // Clean removes the manifest.
    expect(await runBuildCacheCli(config, ['clean', 'server'])).toBe(0);
    expect(await exists(await resolveManifestPath({ ...config, target: 'server' }))).toBe(false);
  });

  it('clean with no target wipes the whole cache dir', async () => {
    await runBuildCacheCli(config, ['save', 'server']);
    expect(await exists(config.manifestDir)).toBe(true);
    expect(await runBuildCacheCli(config, ['clean'])).toBe(0);
    expect(await exists(config.manifestDir)).toBe(false);
  });

  it('refuses to clean a manifestDir that resolves to the project root (no rm of the checkout)', async () => {
    // '.' resolves to projectRoot — a recursive clean there would wipe everything.
    expect(await runBuildCacheCli({ projectRoot: root, manifestDir: '.' }, ['clean'])).toBe(2);
    expect(await exists(join(root, 'package.json'))).toBe(true);
  });
});
