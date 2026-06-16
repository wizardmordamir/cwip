// cwip/build — an incremental build cache. Fingerprints a build target's INPUT
// files into a saved manifest, compares against it on the next run, and lets the
// build be skipped when nothing changed (and forced when the output is missing).
//
// Node/Bun only (node:crypto/fs/child_process). Apps keep a ~6-line wrapper that
// calls `runBuildCacheCli(config)` with their config (ignore lists, extra input
// dirs, …) and decide WHEN to run it from their package.json scripts; cwip owns
// HOW the hashing is done.
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
