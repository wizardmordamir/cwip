import { describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// The published surface — the package.json `exports` subpaths — is also written
// out by hand in README.md (the human entry-point table) and AGENTS.md (the
// LLM/agent map). Those drift: this package shipped a README documenting 3 entry
// points while package.json exported 12. This guard makes that drift a failing
// test — every real export subpath MUST be documented in both docs, so you can't
// add an export without surfacing it. (Forward-only on purpose: it catches the
// "added an export, forgot the docs" direction, which is the one that bites.)

const ROOT = resolve(import.meta.dir, '..', '..', '..');

/** Map a package.json exports key to the import specifier a user writes. */
const toSpecifier = (exportKey: string): string => (exportKey === '.' ? 'cwip' : `cwip/${exportKey.slice(2)}`);

/** Match `spec` as a whole token — `cwip` must NOT be satisfied by `cwip/query`. */
const mentions = (doc: string, spec: string): boolean =>
  new RegExp(`${spec.replace(/[/]/g, '\\/')}(?![\\w/])`).test(doc);

describe('docs surface (no entry-point drift)', () => {
  it('every package.json export subpath is documented in README and AGENTS', async () => {
    const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
    const [readme, agents] = await Promise.all([
      readFile(resolve(ROOT, 'README.md'), 'utf8'),
      readFile(resolve(ROOT, 'AGENTS.md'), 'utf8'),
    ]);

    const specifiers = Object.keys(pkg.exports).map(toSpecifier);
    const undocumented = specifiers.flatMap((spec) => {
      const missing: string[] = [];
      if (!mentions(readme, spec)) missing.push(`${spec} (README.md)`);
      if (!mentions(agents, spec)) missing.push(`${spec} (AGENTS.md)`);
      return missing;
    });

    expect(undocumented).toEqual([]);
  });

  it('guards a meaningful number of subpaths', async () => {
    const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
    expect(Object.keys(pkg.exports).length).toBeGreaterThan(5);
  });
});
