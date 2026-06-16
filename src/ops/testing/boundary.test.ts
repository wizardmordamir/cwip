import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import * as testing from '.';

/**
 * Locks the entry-point boundaries so a future refactor can't silently
 * reintroduce the `bun:test` leak into `cwip` / `cwip/node` (which would crash
 * those entry points in any non-Bun runtime).
 */
describe('entry-point boundaries', () => {
  const here = import.meta.dir;
  const SRC = resolve(here, '..');

  // Resolve a relative import specifier to a concrete source file, if any.
  const resolveRelative = (fromFile: string, spec: string): string | null => {
    const base = resolve(dirname(fromFile), spec);
    for (const candidate of [`${base}.ts`, join(base, 'index.ts'), `${base}.tsx`]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  };

  // All `bun:test` references transitively reachable from an entry file.
  const bunTestReachableFrom = (entry: string): string[] => {
    const offenders: string[] = [];
    const visited = new Set<string>();
    const stack = [entry];

    while (stack.length) {
      const file = stack.pop() as string;
      if (visited.has(file)) continue;
      visited.add(file);

      const source = readFileSync(file, 'utf8');
      const specifiers = [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

      for (const spec of specifiers) {
        if (spec === 'bun:test') {
          offenders.push(file.replace(`${SRC}/`, ''));
          continue;
        }
        if (spec.startsWith('.')) {
          const resolved = resolveRelative(file, spec);
          if (resolved) stack.push(resolved);
        }
      }
    }

    return offenders;
  };

  it('cwip (root) never imports bun:test', () => {
    expect(bunTestReachableFrom(join(SRC, 'index.ts'))).toEqual([]);
  });

  it('cwip/node never imports bun:test', () => {
    expect(bunTestReachableFrom(join(SRC, 'node', 'index.ts'))).toEqual([]);
  });

  it('cwip/testing exposes the documented public API', () => {
    const api = testing as Record<string, unknown>;
    const expectedFns = [
      // system mocks / factories
      'initializeGlobalMocks',
      'enableSystemMocks',
      'areSystemMocksEnabled',
      'fake',
      'fakeReject',
      'resetAllMocks',
      // isolation + harness primitives
      'makeTempDir',
      'removeTempDir',
      'isolateEnvDir',
      'startTestServer',
      'makeHttpTestClient',
      // fixtures
      'defineFixture',
      'sequence',
      'seqId',
      'resetSeqIds',
      // reporting
      'createRunReport',
      'summarizeReport',
      'renderReportText',
      'renderReportHtml',
      'writeReportFiles',
      'parseJUnitXml',
      // report dir reader (re-exported from cwip/test-report)
      'readReport',
      'readReportSummaries',
      'resolveArtifactPath',
      // db mock (re-exported from cwip/db-mock) + bun driver injection
      'createDbMockRegistry',
      'registerFixtures',
      'recordFixture',
      'fixtureTypes',
      'installDbMocks',
      // schema assertions + lifecycle
      'validateObjectBySchema',
      'expectMatchObjectBySchema',
      'expectMatchObjectByKeys',
      'createPendingFileOperations',
    ];
    for (const name of expectedFns) expect(typeof api[name]).toBe('function');
  });
});
