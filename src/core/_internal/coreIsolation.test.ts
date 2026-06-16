import { describe, expect, it } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

// The zero-dependency guarantee of `cwip` and `cwip/node` is load-bearing: a
// browser/Node consumer of the core must never transitively pull in a framework
// peer. This guard fails if any *core* source file (everything outside the
// top-level peer subpath dirs) imports a peer package or a peer subpath. Peer
// code lives only behind its own subpath and resolves the peer lazily via
// requirePeer.

const SRC = resolve(import.meta.dir, '..');
// Top-level src/ dirs that are peer-dep subpaths (NOT e.g. src/query/mongo).
const PEER_DIRS = ['schema', 'server', 'mongodb', 'excel', 'react'];
const PEER_PACKAGES = ['ajv', 'ajv-formats', 'express', 'cors', 'mongodb', 'xlsx', 'react', 'react-dom'];

/** The top-level segment of a path relative to src/ (e.g. 'query' for src/query/mongo/x.ts). */
const topDir = (path: string): string => relative(SRC, path).split('/')[0];

const walk = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
};

/** Module specifiers of every import/export-from (and bare side-effect import) in a file. */
const importSpecifiers = (source: string): string[] => {
  const specs: string[] = [];
  for (const m of source.matchAll(/(?:import|export)\b[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) {
    specs.push(m[1]);
  }
  for (const m of source.matchAll(/import\s*['"]([^'"]+)['"]/g)) {
    specs.push(m[1]);
  }
  return specs;
};

const referencesPeer = (fromFile: string, spec: string): boolean => {
  if (PEER_PACKAGES.includes(spec)) {
    return true;
  }
  if (spec.startsWith('.')) {
    return PEER_DIRS.includes(topDir(resolve(dirname(fromFile), spec)));
  }
  return false;
};

describe('core isolation (zero-dep guarantee)', () => {
  it('no core file imports a peer package or peer subpath', async () => {
    const files = (await walk(SRC)).filter((f) => !f.endsWith('.test.ts') && !PEER_DIRS.includes(topDir(f)));
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const spec of importSpecifiers(source)) {
        if (referencesPeer(file, spec)) {
          violations.push(`${relative(SRC, file)} imports "${spec}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('actually scanned a meaningful number of core files', async () => {
    const files = (await walk(SRC)).filter((f) => !f.endsWith('.test.ts') && !PEER_DIRS.includes(topDir(f)));
    expect(files.length).toBeGreaterThan(50);
  });
});
