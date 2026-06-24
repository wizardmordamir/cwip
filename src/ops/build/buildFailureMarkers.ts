// Build-output honesty (the fail-fast layer, NOT the cache above it).
//
// A build script can exit 0 while the build actually FAILED — a stray `|| true`, a
// swallowed catch, or a bundler (vite/rollup/esbuild/`bun build`) that prints a fatal
// error yet still returns 0. Every gate that trusts the exit code alone then certifies
// a BROKEN build GREEN. So a build only counts as green when it exits 0 AND its OUTPUT
// carries none of the known bundler/build failure markers.
//
// This is the ONE canonical source for those markers + the green decision, shared by
// every checkpoint that scans build output — an app's build orchestrator, the per-task
// executor verify gate, and the integration→main promotion gate — so they can never
// drift out of sync (the bug class where a marker is added to one gate but not another,
// silently re-opening the exit-0 lie for that marker). Consumers import from here
// instead of re-declaring a local copy.

/**
 * Known build/bundler failure markers that can appear in build output even when the
 * process exits 0. Emitted by vite/rollup/esbuild/`bun build` on failure, but never by
 * a clean build (asset filenames that merely contain "error", chunk-size warnings, and
 * bun/esbuild success summaries are intentionally NOT matched).
 */
export const BUILD_FAILURE_MARKERS =
  /error during build|Build failed|✗ Build|RollupError|Could not resolve|is not exported by|Transform failed|esbuild.*error/i;

/**
 * Returns the first build-failure marker found in `output`, or null. Lets a runner (or
 * a test) treat marker-in-output as RED even when the process exited 0.
 */
export function findBuildFailureMarker(output: string): string | null {
  const m = output.match(BUILD_FAILURE_MARKERS);
  return m ? m[0] : null;
}

/**
 * A build counts as GREEN only when it exits 0 AND prints no known failure marker — so
 * no checkpoint trusts the exit code alone.
 */
export function buildIsGreen(result: { code: number; out: string }): boolean {
  return result.code === 0 && findBuildFailureMarker(result.out) === null;
}
