// cwip/noise — seeded, deterministic spatial noise primitives shared across every game that
// samples smooth procedural fields (terrain, atmosphere, particle drift, material textures).
// Pure integer-hash spine + value-noise / fBm / ridge / Worley / curl. No Math.random, no
// clock — all entropy flows from the integer `seed`, so the same inputs yield byte-identical
// output on every machine and every run.
//
// Hash kernel: the MurmurHash3-style hash32 from cwip/audio/core (shared with comet,
// wilds, lullabyte). Games that carry their own hash spine (e.g. deepwater's XOR-chain,
// sanctum's original XOR-imul chain) will produce different per-cell values after
// retrofitting onto this module — the determinism PROPERTY is preserved (same inputs →
// same output), but the actual numbers change. Flag this wherever you retrofit.

import { hash32 } from '../audio/core/rng';

export { hash32 };

// Lattice value in [0,1) at an integer 2-D corner, keyed by seed.
// Uses salt 0x68bc21eb (matches comet/world/noise.ts — byte-identical retrofit for comet + wilds).
const lattice2 = (ix: number, iy: number, seed: number): number => hash32(ix, iy, seed, 0x68bc21eb) / 4294967296;

// Lattice value in [0,1) at an integer 3-D corner.
const lattice3 = (ix: number, iy: number, iz: number, seed: number): number =>
  hash32(ix ^ Math.imul(iy, 0x9e3779b9), iz, seed, 0x68bc21eb) / 4294967296;

// Quintic fade (Perlin) — C2-continuous so adjacent cells join without creases.
const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smooth (quintic-faded) bilinear value noise. Deterministic; returns [0, 1). */
export const value2D = (x: number, y: number, seed: number): number => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = fade(x - x0);
  const v = fade(y - y0);
  const c00 = lattice2(x0, y0, seed);
  const c10 = lattice2(x0 + 1, y0, seed);
  const c01 = lattice2(x0, y0 + 1, seed);
  const c11 = lattice2(x0 + 1, y0 + 1, seed);
  return lerp(lerp(c00, c10, u), lerp(c01, c11, u), v);
};

/** Smooth trilinear value noise. Returns [0, 1). */
export const value3D = (x: number, y: number, z: number, seed: number): number => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const u = fade(x - x0);
  const v = fade(y - y0);
  const w = fade(z - z0);
  const c000 = lattice3(x0, y0, z0, seed);
  const c100 = lattice3(x0 + 1, y0, z0, seed);
  const c010 = lattice3(x0, y0 + 1, z0, seed);
  const c110 = lattice3(x0 + 1, y0 + 1, z0, seed);
  const c001 = lattice3(x0, y0, z0 + 1, seed);
  const c101 = lattice3(x0 + 1, y0, z0 + 1, seed);
  const c011 = lattice3(x0, y0 + 1, z0 + 1, seed);
  const c111 = lattice3(x0 + 1, y0 + 1, z0 + 1, seed);
  const x00 = lerp(c000, c100, u);
  const x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u);
  const x11 = lerp(c011, c111, u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
};

/**
 * Fractal Brownian motion (lacunarity 2, gain 0.5). Returns [0, 1).
 *
 * Default is 4 octaves. Comet + wilds use 3 — pass `octaves: 3` explicitly (or wrap it) to
 * keep their per-world outputs unchanged if you care about seed continuity across saves.
 */
export const fbm2D = (x: number, y: number, seed: number, octaves = 4): number => {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const os = (seed ^ Math.imul(o + 1, 0x9e3779b1)) >>> 0;
    sum += amp * value2D(x * freq, y * freq, os);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
};

/** Ridged fBm — sharp veins (1 − |2·n − 1|), good for grain/cracks. Returns [0, 1]. */
export const ridge2D = (x: number, y: number, seed: number, octaves = 4): number => {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const os = (seed ^ Math.imul(o + 7, 0x85ebca6b)) >>> 0;
    const n = value2D(x * freq, y * freq, os);
    const r = 1 - Math.abs(2 * n - 1);
    sum += amp * r * r;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
};

/**
 * Single-fold ridged value (1 − |2·fbm − 1|). Returns [0, 1].
 * Cheaper than ridge2D; useful for alpine ridgelines and terrain veins.
 */
export const ridged = (x: number, y: number, seed: number, octaves = 4): number =>
  1 - Math.abs(2 * fbm2D(x, y, seed, octaves) - 1);

/**
 * Worley (cellular) F1 distance to the nearest jittered feature point. Returns [0, 1]
 * (clamped): 0 at a cell centre, rising toward the boundary — a natural crevice/vein mask.
 */
export const worley2D = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 1e9;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const h = hash32(cx, cy, seed, 0);
      const fx = cx + (h & 0xffff) / 65536;
      const fy = cy + ((h >>> 16) & 0xffff) / 65536;
      const ex = fx - x;
      const ey = fy - y;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d < best) best = d;
    }
  }
  return Math.min(1, best);
};

/**
 * Divergence-free curl of the fBm potential → a drifting 2-D flow vector. Incompressible by
 * construction (motes swirl rather than pile). Components are bounded and finite.
 */
export const curl2D = (x: number, y: number, seed: number): { x: number; y: number } => {
  const eps = 1e-3;
  const dphiDy = (fbm2D(x, y + eps, seed) - fbm2D(x, y - eps, seed)) / (2 * eps);
  const dphiDx = (fbm2D(x + eps, y, seed) - fbm2D(x - eps, y, seed)) / (2 * eps);
  return { x: dphiDy, y: -dphiDx };
};
