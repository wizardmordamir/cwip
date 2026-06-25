import { describe, expect, it } from 'bun:test';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

// The published surface — the package.json `exports` subpaths — is also written
// out by hand in README.md (the human entry-point table) and AGENTS.md (the
// LLM/agent map). Those drift: this package shipped a README documenting 3 entry
// points while package.json exported 12. This guard makes that drift a failing
// test — every real export subpath MUST be documented in both docs, so you can't
// add an export without surfacing it. (Forward-only on purpose: it catches the
// "added an export, forgot the docs" direction, which is the one that bites.)

const ROOT = resolve(import.meta.dir, '..', '..', '..');

/**
 * In a git worktree `.git` is a FILE containing `gitdir: /path/.git/worktrees/<name>`.
 * Walk up 3 dirs from that path to find the primary checkout root so the
 * GITIGNORED-but-local docs (AGENTS.md, CHANGELOG.md) — which exist only in the
 * primary — are readable from either the primary or a worktree.
 *
 * NOTE: only gitignored docs are read from here. README.md is TRACKED and present
 * in every checkout, so it's read from ROOT (the local checkout being verified) —
 * otherwise a worktree that ADDS an export and documents it in its own README could
 * never satisfy the guard (the primary's README only updates on promotion), a
 * promotion deadlock that defeats the guard's whole "you can't add an export without
 * surfacing it" purpose.
 */
async function findDocsRoot(from: string): Promise<string> {
  const dotGit = resolve(from, '.git');
  try {
    const s = await stat(dotGit);
    if (s.isDirectory()) return from;
    const content = await readFile(dotGit, 'utf8');
    const m = content.match(/^gitdir:\s*(.+)/m);
    if (!m) return from;
    return resolve(m[1].trim(), '..', '..', '..');
  } catch {
    return from;
  }
}

const DOCS_ROOT = await findDocsRoot(ROOT);

/** Map a package.json exports key to the import specifier a user writes. */
const toSpecifier = (exportKey: string): string => (exportKey === '.' ? 'cwip' : `cwip/${exportKey.slice(2)}`);

/** Match `spec` as a whole token — `cwip` must NOT be satisfied by `cwip/query`. */
const mentions = (doc: string, spec: string): boolean =>
  new RegExp(`${spec.replace(/[/]/g, '\\/')}(?![\\w/])`).test(doc);

describe('docs surface (no entry-point drift)', () => {
  it('every package.json export subpath is documented in README and AGENTS', async () => {
    const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
    const [readme, agents] = await Promise.all([
      readFile(resolve(ROOT, 'README.md'), 'utf8'), // tracked → read the local checkout's copy
      readFile(resolve(DOCS_ROOT, 'AGENTS.md'), 'utf8'), // gitignored → only in the primary
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
