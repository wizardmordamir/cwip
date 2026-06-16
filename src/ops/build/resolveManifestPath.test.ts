import { describe, expect, it } from 'bun:test';
import { basename, join, resolve } from 'node:path';
import { resolveManifestPath } from '.';

const ROOT = '/tmp/some-project';

describe('resolveManifestPath', () => {
  it('defaults under node_modules/.cache and names the file by target basename', async () => {
    const path = await resolveManifestPath({ target: 'server', projectRoot: ROOT });
    expect(path).toBe(join(ROOT, 'node_modules/.cache/cwip-build', 'server.json'));
  });

  it('keeps server and ui in separate manifest files', async () => {
    const server = await resolveManifestPath({ target: 'server', projectRoot: ROOT });
    const ui = await resolveManifestPath({ target: 'ui', projectRoot: ROOT });
    expect(server).not.toBe(ui);
  });

  it('honours a relative manifestDir (resolved against projectRoot)', async () => {
    const path = await resolveManifestPath({ target: 'server', projectRoot: ROOT, manifestDir: '.cache/mine' });
    expect(path).toBe(join(ROOT, '.cache/mine', 'server.json'));
  });

  it('honours an absolute manifestDir', async () => {
    const path = await resolveManifestPath({ target: 'ui', projectRoot: ROOT, manifestDir: '/var/cache/x' });
    expect(path).toBe(join('/var/cache/x', 'ui.json'));
  });

  it('names a "." target by the repo folder name', async () => {
    const path = await resolveManifestPath({ target: '.', projectRoot: ROOT });
    expect(path).toBe(join(ROOT, 'node_modules/.cache/cwip-build', `${basename(resolve(ROOT))}.json`));
  });
});
