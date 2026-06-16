import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearJsonConfigCache, loadJsonConfig, saveJsonConfig } from '.';

interface Cfg extends Record<string, unknown> {
  port: number;
  host: string;
}

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cwip-config-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadJsonConfig', () => {
  it('merges file values over defaults', async () => {
    const file = join(dir, 'a.json');
    await writeFile(file, JSON.stringify({ port: 8080 }));
    const cfg = await loadJsonConfig<Cfg>(file, { defaults: { port: 3000, host: 'localhost' } });
    expect(cfg).toEqual({ port: 8080, host: 'localhost' });
  });

  it('returns defaults in-memory when the file is missing', async () => {
    const cfg = await loadJsonConfig<Cfg>(join(dir, 'missing.json'), { defaults: { port: 3000, host: 'h' } });
    expect(cfg).toEqual({ port: 3000, host: 'h' });
  });

  it('creates the file from defaults when createIfMissing', async () => {
    const file = join(dir, 'created.json');
    await loadJsonConfig<Cfg>(file, { defaults: { port: 1, host: 'x' }, createIfMissing: true });
    const reloaded = await loadJsonConfig<Cfg>(file);
    expect(reloaded.port).toBe(1);
  });

  it('applies a parse() normalizer', async () => {
    const file = join(dir, 'parsed.json');
    await writeFile(file, JSON.stringify({ port: '9090' }));
    const cfg = await loadJsonConfig<Cfg>(file, {
      parse: (raw) => ({ port: Number((raw as { port: string }).port) }),
    });
    expect(cfg.port).toBe(9090);
  });

  it('saveJsonConfig round-trips and busts the cache', async () => {
    const file = join(dir, 'rt.json');
    await saveJsonConfig(file, { port: 1, host: 'a' });
    expect((await loadJsonConfig<Cfg>(file)).port).toBe(1);
    await saveJsonConfig(file, { port: 2, host: 'a' });
    expect((await loadJsonConfig<Cfg>(file)).port).toBe(2);
    clearJsonConfigCache(file);
  });
});
