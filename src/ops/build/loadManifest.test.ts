import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadManifest, saveManifest } from '.';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cwip-manifest-io-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('saveManifest + loadManifest', () => {
  it('round-trips a manifest, creating the directory', async () => {
    const path = join(root, 'nested', 'server.json');
    const manifest = { 'a.ts': '1', 'b.ts': '2' };
    await saveManifest(path, manifest);
    expect(await loadManifest(path)).toEqual(manifest);
  });

  it('returns null for a missing file', async () => {
    expect(await loadManifest(join(root, 'nope.json'))).toBeNull();
  });

  it('returns null for corrupt or non-object JSON (legacy single-hash format)', async () => {
    const corrupt = join(root, 'corrupt.json');
    await writeFile(corrupt, 'not json at all');
    expect(await loadManifest(corrupt)).toBeNull();

    const legacy = join(root, 'legacy.json');
    await writeFile(legacy, '"a-single-rolled-hash"');
    expect(await loadManifest(legacy)).toBeNull();
  });
});
