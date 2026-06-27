// cwip/audio — shared primitives for code-synthesized, fully-deterministic generative audio.
//
// SCOPE (deliberately narrow). This package holds only the surface that is GENUINELY shared
// and byte-for-byte identical across external app audio engines — the deterministic
// `core/` kernel (seeded RNG + music-theory pitch math). The *engines themselves* stay
// per-consumer on purpose: Apps can use a ~150ms-horizon spatial region-music model, another may use a
// ≥2s-horizon timeline model, and their scheduler / voice-pool / FDN-reverb / master-bus DSP
// have intentionally different topologies that SOUND different by design. Unifying things like these would
// force one app's sound onto the other (a sonic regression), so they are left in each app.
// See the task notes for the divergence analysis behind this boundary.
export * from './core';
