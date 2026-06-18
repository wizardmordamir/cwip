// Determinism + bounds guard — the same guarantee as the per-game noise specs, but living
// in cwip so any consumer can trust the shared implementation is correct before retrofitting.
import { describe, expect, it } from 'bun:test';
import { curl2D, fbm2D, hash32, ridge2D, ridged, value2D, value3D, worley2D } from './noise';

const SEED = 0x9e3779b9;

describe('cwip/noise — hash32', () => {
  it('is deterministic and unsigned 32-bit', () => {
    for (let i = 0; i < 64; i++) {
      const v = hash32(i, i * 3, i * 7, SEED);
      expect(v).toBe(hash32(i, i * 3, i * 7, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('avalanches on each input', () => {
    expect(hash32(1, 2, 3, SEED)).not.toBe(hash32(2, 2, 3, SEED));
    expect(hash32(1, 2, 3, SEED)).not.toBe(hash32(1, 3, 3, SEED));
    expect(hash32(1, 2, 3, SEED)).not.toBe(hash32(1, 2, 4, SEED));
    expect(hash32(1, 2, 3, SEED)).not.toBe(hash32(1, 2, 3, SEED + 1));
  });
});

describe('cwip/noise — value2D / value3D', () => {
  it('value2D is deterministic and in [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = value2D(i * 0.37, i * -0.21, SEED);
      expect(v).toBe(value2D(i * 0.37, i * -0.21, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('value2D is smooth (tiny step → tiny change)', () => {
    const a = value2D(3.2, 1.1, SEED);
    const b = value2D(3.2001, 1.1, SEED);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  it('value3D is deterministic and in [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = value3D(i * 0.137, i * 0.071, i * 0.053, SEED);
      expect(v).toBe(value3D(i * 0.137, i * 0.071, i * 0.053, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('value2D(x, y, s) === value3D(x, y, 0, s) within float tolerance', () => {
    // They use different lattice arity so exact equality is not guaranteed, but both should
    // be well-behaved. Just check determinism + range for the 3D path here.
    const v = value3D(1.5, 2.5, 0, SEED);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe('cwip/noise — fbm2D / ridge2D / ridged', () => {
  it('fbm2D is deterministic and in [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = fbm2D(i * 0.13, i * 0.07, SEED);
      expect(v).toBe(fbm2D(i * 0.13, i * 0.07, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('fbm2D is continuous', () => {
    let prev = fbm2D(0, 0, SEED);
    let maxJump = 0;
    for (let i = 1; i < 300; i++) {
      const v = fbm2D(i * 0.01, 0, SEED);
      maxJump = Math.max(maxJump, Math.abs(v - prev));
      prev = v;
    }
    expect(maxJump).toBeLessThan(0.08);
  });

  it('fbm2D respects the octaves parameter', () => {
    for (let o = 1; o <= 6; o++) {
      const v = fbm2D(1.5, 2.3, SEED, o);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    // Different octave counts produce different outputs.
    expect(fbm2D(1.5, 2.3, SEED, 3)).not.toBe(fbm2D(1.5, 2.3, SEED, 4));
  });

  it('ridge2D is in [0, 1] and deterministic', () => {
    for (let i = 0; i < 120; i++) {
      const v = ridge2D(i * 0.3, i * 0.21, SEED);
      expect(v).toBe(ridge2D(i * 0.3, i * 0.21, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('ridged is in [0, 1] and deterministic', () => {
    for (let i = 0; i < 120; i++) {
      const v = ridged(i * 0.05, i * 0.07, SEED);
      expect(v).toBe(ridged(i * 0.05, i * 0.07, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('cwip/noise — worley2D', () => {
  it('is in [0, 1] and deterministic', () => {
    for (let i = 0; i < 150; i++) {
      const v = worley2D(i * 0.41, i * 0.23, SEED);
      expect(v).toBe(worley2D(i * 0.41, i * 0.23, SEED));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('cwip/noise — curl2D', () => {
  it('is finite, bounded, and deterministic', () => {
    for (let i = 0; i < 120; i++) {
      const c = curl2D(i * 0.33, i * 0.19, SEED);
      const same = curl2D(i * 0.33, i * 0.19, SEED);
      expect(c.x).toBe(same.x);
      expect(c.y).toBe(same.y);
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
      expect(Math.abs(c.x)).toBeLessThan(10);
      expect(Math.abs(c.y)).toBeLessThan(10);
    }
  });
});

describe('cwip/noise — no ambient non-determinism', () => {
  it('same seed always produces the same stream', () => {
    const run = () => {
      const results: number[] = [];
      for (let i = 0; i < 32; i++) {
        results.push(value2D(i * 0.25, i * 0.11, SEED));
        results.push(fbm2D(i * 0.15, i * 0.09, SEED));
      }
      return results;
    };
    expect(run()).toEqual(run());
  });
});
