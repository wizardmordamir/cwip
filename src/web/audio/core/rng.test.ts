import { describe, expect, it } from 'bun:test';
import { hash1, hash32, hashString, mulberry32, pick, randInt, stream, weightedPick } from './rng';

// Known-answer vectors lock the EXACT integer stream. These match the byte-identical
// originals in cursedalchemy's `shared/lullabyte/rng.ts` and `comet/world/rng.ts`; any change
// here is a cross-machine determinism break (shared seeds would stop rendering identically).
describe('hash32 / hash1 / hashString', () => {
  it('produces stable known-answer hashes', () => {
    expect(hash32(0, 0, 0, 0)).toBe(3350504363);
    expect(hash32(1, 2, 3, 4)).toBe(3659326295);
    expect(hash1(7, 99)).toBe(882772404);
    expect(hashString('cwip/audio')).toBe(2571403319);
  });

  it('returns unsigned 32-bit integers', () => {
    for (const v of [hash32(5, 6, 7, 8), hash1(11, 22), hashString('hello')]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('avalanches: flipping one input bit changes ~half the output bits', () => {
    const a = hash32(0, 0, 0, 0);
    const b = hash32(1, 0, 0, 0);
    const changed = (a ^ b)
      .toString(2)
      .split('')
      .filter((c) => c === '1').length;
    expect(changed).toBeGreaterThan(8); // far from 0; not a weak hash
  });

  it('hash1(a, salt) equals hash32(a, salt, 0, 0)', () => {
    expect(hash1(42, 7)).toBe(hash32(42, 7, 0, 0));
  });
});

describe('mulberry32', () => {
  it('is reproducible for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('matches the known-answer stream', () => {
    const r = mulberry32(12345);
    expect(r()).toBeCloseTo(0.9797282677609473, 15);
    expect(r()).toBeCloseTo(0.3067522644996643, 15);
    expect(r()).toBeCloseTo(0.484205421525985, 15);
  });

  it('stays in [0, 1)', () => {
    const r = mulberry32(777);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds decorrelate', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('stream / randInt / pick / weightedPick', () => {
  it('stream seeds a fresh mulberry32 from (seed, a, b, salt)', () => {
    const s = stream(1, 2, 3, 4);
    const ref = mulberry32(hash32(1, 2, 3, 4));
    expect(s()).toBe(ref());
    expect(s()).toBe(ref());
  });

  it('randInt stays in [0, n) and is integer', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = randInt(r, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('pick selects a member of the array', () => {
    const arr = ['a', 'b', 'c'] as const;
    const r = mulberry32(5);
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(r, arr));
  });

  it('weightedPick respects weights (zero-weight items never chosen)', () => {
    const r = mulberry32(3);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 2000; i++) {
      counts[
        weightedPick(r, [
          ['a', 3],
          ['b', 1],
          ['c', 0],
        ] as const)
      ]++;
    }
    expect(counts.c).toBe(0);
    expect(counts.a).toBeGreaterThan(counts.b);
  });

  it('weightedPick falls back to the first item when all weights are zero', () => {
    const r = mulberry32(1);
    expect(
      weightedPick(r, [
        ['x', 0],
        ['y', 0],
      ] as const),
    ).toBe('x');
  });
});
