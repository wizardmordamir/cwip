// cwip/audio core — the pure, browser-safe, deterministic foundation shared by generative
// audio engines (and procedural world-gen): a seeded RNG kernel and a music-theory pitch
// kernel. No Web Audio, no clock, no Math.random — every output is a pure function of its
// inputs, so the same seed renders byte-identical results on every machine (guarded by
// `determinism.test.ts`).
export * from './rng';
export * from './theory';
