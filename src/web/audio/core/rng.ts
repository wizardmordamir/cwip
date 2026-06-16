// Hashing + seeded RNG — the deterministic spine of generative audio (and procedural
// world-gen). Everything here is pure integer math: no Math.random, no clock, no Web API.
// The same inputs yield the same stream on every machine within a build, which is what
// lets a shared seed render byte-identical music (and a byte-identical cosmos for co-op).
//
// Extracted from cursedalchemy's Lullabyte (`shared/lullabyte/rng.ts`, the canonical
// source) and Comet (`comet/world/rng.ts`) — the four hashing/RNG primitives were
// byte-for-byte identical in both, so this is a ZERO-behaviour-change unification.
// Domain-specific SALT tables stay per-consumer (they key independent generative streams).

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

// MurmurHash3-style mix step: fold one 32-bit input word into the running hash.
const mixIn = (h: number, value: number): number => {
  let k = value | 0;
  k = Math.imul(k, C1);
  k = (k << 15) | (k >>> 17); // rotl 15
  k = Math.imul(k, C2);
  let x = h ^ k;
  x = (x << 13) | (x >>> 19); // rotl 13
  x = (Math.imul(x, 5) + 0xe6546b64) | 0;
  return x >>> 0;
};

// splitmix32 finalizer — strong avalanche on the accumulated state.
const finalize = (h: number): number => {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad);
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a2d97);
  x ^= x >>> 15;
  return x >>> 0;
};

/**
 * Mix four 32-bit inputs into one stable unsigned 32-bit seed. Avalanche-tested: flipping
 * a single input bit changes ~half of the output bits. The four `(seed, a, b, salt)` slots
 * keep independent generative streams (harmony / melody / region / artifact …) decorrelated
 * so parts never align by accident.
 */
export const hash32 = (a: number, b: number, c: number, d: number): number => {
  let h = 0x9e3779b9 >>> 0; // golden-ratio seed constant
  h = mixIn(h, a);
  h = mixIn(h, b);
  h = mixIn(h, c);
  h = mixIn(h, d);
  return finalize(h);
};

/** Hash a single number into [0, 2^32). Convenience for one-input lattices. */
export const hash1 = (a: number, salt: number): number => hash32(a, salt, 0, 0);

/**
 * mulberry32 — a fast, well-distributed 32-bit PRNG. Returns a stateful generator producing
 * numbers in [0, 1). Seed a fresh one per (concern, salt) so streams stay independent and
 * reproducible.
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a string hash → unsigned 32-bit. Used for stable content checksums. */
export const hashString = (s: string): number => {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** Convenience: seed a fresh stream from a master seed + integer coordinates + a salt. */
export const stream = (seed: number, a: number, b: number, salt: number): (() => number) =>
  mulberry32(hash32(seed, a, b, salt));

/** Draw an integer in [0, n) from a `mulberry32` generator. Integer-gated. */
export const randInt = (rng: () => number, n: number): number => Math.floor(rng() * n) >>> 0;

/** Pick an element from a non-empty array deterministically. */
export const pick = <T>(rng: () => number, arr: readonly T[]): T => arr[randInt(rng, arr.length)];

/**
 * Weighted pick over `[item, weight]` pairs. Integer-gated: weights are summed and a draw is
 * compared against integer cumulative thresholds, never a float equality.
 */
export const weightedPick = <T>(rng: () => number, pairs: ReadonlyArray<readonly [T, number]>): T => {
  let total = 0;
  for (const [, w] of pairs) total += Math.max(0, w | 0);
  if (total <= 0) return pairs[0][0];
  const r = randInt(rng, total);
  let acc = 0;
  for (const [item, w] of pairs) {
    acc += Math.max(0, w | 0);
    if (r < acc) return item;
  }
  return pairs[pairs.length - 1][0];
};
