import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NO_CACHE_ENV, resolveManifestPath, runBuildCacheCli } from '.';

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

// The green-gate / merge-boundary safeguard: a `check` must be forceable so a
// cached green can never be trusted. These run against a genuinely-fresh cache
// (saved manifest + present output) to prove force overrides a real cache hit.
describe('runBuildCacheCli force / no-cache mode', () => {
  let froot: string;
  let fconfig: { projectRoot: string; manifestDir: string };

  beforeAll(async () => {
    froot = await mkdtemp(join(tmpdir(), 'cwip-force-'));
    fconfig = { projectRoot: froot, manifestDir: join(froot, '__manifests') };
    await mkdir(join(froot, 'server/src'), { recursive: true });
    await mkdir(join(froot, 'server/dist'), { recursive: true });
    await writeFile(join(froot, 'package.json'), '{}');
    await writeFile(join(froot, 'server/src/a.ts'), 'export const a = 1;');
    await writeFile(join(froot, 'server/dist/out.js'), 'built');
    // Save so a *normal* check is genuinely fresh (skips).
    expect(await runBuildCacheCli(fconfig, ['save', 'server'])).toBe(0);
  });

  afterEach(() => {
    delete process.env[NO_CACHE_ENV];
  });

  afterAll(async () => {
    await rm(froot, { recursive: true, force: true });
  });

  it('baseline: a fresh check skips (exit 0)', async () => {
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
  });

  it('--force / --no-cache / -f make a fresh check report build-needed (exit 1)', async () => {
    expect(await runBuildCacheCli(fconfig, ['check', 'server', '--force'])).toBe(1);
    expect(await runBuildCacheCli(fconfig, ['check', 'server', '--no-cache'])).toBe(1);
    expect(await runBuildCacheCli(fconfig, ['check', 'server', '-f'])).toBe(1);
    // …and the cache is still intact afterward (force never deletes it).
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
  });

  it('a force flag is positional-independent (check --force server)', async () => {
    expect(await runBuildCacheCli(fconfig, ['check', '--force', 'server'])).toBe(1);
  });

  it(`${NO_CACHE_ENV} forces every check while set, restoring skip once unset`, async () => {
    process.env[NO_CACHE_ENV] = '1';
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(1);
    delete process.env[NO_CACHE_ENV];
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
  });

  it(`a falsy ${NO_CACHE_ENV} (0/false) does not force a rebuild`, async () => {
    process.env[NO_CACHE_ENV] = '0';
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
    process.env[NO_CACHE_ENV] = 'false';
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
  });

  it('force never disturbs save/clean (cache stays warm for the inner loop)', async () => {
    // save ignores the flag and still writes the manifest…
    expect(await runBuildCacheCli(fconfig, ['save', 'server', '--force'])).toBe(0);
    expect(await runBuildCacheCli(fconfig, ['check', 'server'])).toBe(0);
    // …and clean ignores it too.
    expect(await runBuildCacheCli(fconfig, ['clean', 'server', '--no-cache'])).toBe(0);
    expect(await exists(await resolveManifestPath({ ...fconfig, target: 'server' }))).toBe(false);
    // Re-save so the describe leaves no half-state.
    expect(await runBuildCacheCli(fconfig, ['save', 'server'])).toBe(0);
  });
});
