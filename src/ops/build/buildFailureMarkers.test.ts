import { describe, expect, it } from 'bun:test';
import { BUILD_FAILURE_MARKERS, buildIsGreen, findBuildFailureMarker } from '.';

describe('build-failure markers (#297)', () => {
  it.each([
    '"X" is not exported by "y.js"',
    'error during build:',
    'RollupError: Could not resolve entry',
    "Could not resolve './missing'",
    'Build failed with 1 error',
    '✗ Build failed in 2.1s',
    'Transform failed with 1 error',
    'esbuild: error: cannot parse',
  ])('flags %j as a failure marker', (output) => {
    expect(findBuildFailureMarker(output)).not.toBeNull();
  });

  it('returns the matched marker text', () => {
    expect(findBuildFailureMarker('x "y" is not exported by z.js')).toBe('is not exported by');
  });

  it('is case-insensitive', () => {
    expect(BUILD_FAILURE_MARKERS.flags).toContain('i');
    expect(findBuildFailureMarker('ERROR DURING BUILD: boom')).not.toBeNull();
  });

  // False-positive guard: a GREEN build whose output the scan wrongly flags as RED is
  // itself a regression. Pin realistic benign output (an asset filename containing
  // "Error", the chunk-size warning, bun/esbuild success summaries) as marker-free.
  it.each([
    'dist/assets/AdminErrors-BdnOBCvj.js  9.32 kB\n(!) Some chunks are larger than 500 kB after minification.\n✓ built in 22.20s',
    '  dist/index.js  1.05 MB\n\n [42ms] bundle 1342 modules',
    '  index.js  2.1mb\n⚡ Done in 312ms',
    'buildCache: saved manifest for "ui" (1729 input files)',
  ])('does NOT flag benign success output: %j', (output) => {
    expect(findBuildFailureMarker(output)).toBeNull();
  });

  describe('buildIsGreen', () => {
    it('green only when exit 0 AND no failure marker', () => {
      expect(buildIsGreen({ code: 0, out: '✓ built in 8.42s' })).toBe(true);
    });
    it('red on a non-zero exit even with clean output', () => {
      expect(buildIsGreen({ code: 1, out: '✓ built in 8.42s' })).toBe(false);
    });
    it('red on an exit-0 build whose output carries a failure marker (the #297 lie)', () => {
      expect(buildIsGreen({ code: 0, out: 'x "y" is not exported by z.js' })).toBe(false);
    });
  });
});
