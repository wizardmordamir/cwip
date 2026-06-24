// cwip/build — build ops shared across apps. Two concerns live here:
//   1. An incremental build CACHE. Fingerprints a build target's INPUT files into a
//      saved manifest, compares against it on the next run, and lets the build be
//      skipped when nothing changed (and forced when the output is missing).
//   2. Build-output HONESTY (`buildFailureMarkers`): the canonical failure-marker scan
//      + green decision every checkpoint shares so a build that exits 0 while FAILING
//      can never be certified green — one source of truth, so the gates can't drift.
//
// The cache is for the FAST INNER LOOP only — it must never be trusted at a green
// gate or across a merge/promotion boundary, where a stale-cache skip could
// certify broken output as green. For those, force a real rebuild: set the
// `CWIP_BUILD_NO_CACHE` env var for the whole gate/merge process, or pass
// `--force`/`--no-cache` to a single `check`. So "green" only ever means
// "actually rebuilt". (`clean` drops the saved hashes outright.)
//
// Node/Bun only (node:crypto/fs/child_process). Apps keep a ~6-line wrapper that
// calls `runBuildCacheCli(config)` with their config (ignore lists, extra input
// dirs, …) and decide WHEN to run it from their package.json scripts; cwip owns
// HOW the hashing is done.
export * from './buildFailureMarkers';
export * from './buildInputManifest';
export * from './checkBuildCache';
export * from './defaults';
export * from './diffManifests';
export * from './loadManifest';
export * from './resolveManifestPath';
export * from './resolveProjectRoot';
export * from './runBuildCacheCli';
export * from './saveManifest';
export * from './types';
