import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash32, mulberry32 } from './core/rng';

// The whole point of cwip/audio's core is reproducibility: the same seed must render
// byte-identical results on every machine and every run. This guard scans the source for the
// usual suspects that silently break that (a clock, Math.random, real crypto) and double-checks
// that the RNG is genuinely deterministic — so a regression fails CI instead of co-op desync.

const CORE_DIR = join(import.meta.dir, 'core');

// Each pattern is a regex + a human reason. `Math.imul`/`hashString`-style usage is fine; we
// only forbid sources of ambient non-determinism.
const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/Math\.random/, 'Math.random (non-deterministic)'],
  [/Date\.now/, 'Date.now (clock)'],
  [/performance\.now/, 'performance.now (clock)'],
  [/\bnew Date\b/, 'new Date (clock)'],
  [/crypto\./, 'crypto (non-deterministic / non-portable)'],
];

describe('cwip/audio core determinism guard', () => {
  it('contains no ambient sources of non-determinism', () => {
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(join(CORE_DIR, file), 'utf8');
      for (const [pattern, reason] of FORBIDDEN) {
        expect(pattern.test(src), `${file} must not use ${reason}`).toBe(false);
      }
    }
  });

  it('renders an identical RNG stream across independent runs', () => {
    const render = () => {
      const r = mulberry32(hash32(2026, 6, 16, 0xdecaf));
      return Array.from({ length: 64 }, () => r());
    };
    expect(render()).toEqual(render());
  });
});
