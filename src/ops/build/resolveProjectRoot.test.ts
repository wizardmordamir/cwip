import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveProjectRoot } from '.';

let nonGitDir: string;

beforeAll(async () => {
  nonGitDir = await mkdtemp(join(tmpdir(), 'cwip-projroot-'));
});

afterAll(async () => {
  await rm(nonGitDir, { recursive: true, force: true });
});

describe('resolveProjectRoot', () => {
  it('uses an explicit override, resolved to absolute', async () => {
    expect(await resolveProjectRoot('/anywhere', 'some/relative')).toBe(resolve('some/relative'));
  });

  it('falls back to the start dir when not inside a git repo', async () => {
    expect(await resolveProjectRoot(nonGitDir)).toBe(resolve(nonGitDir));
  });
});
