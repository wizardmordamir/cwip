// Default configuration for the build cache. Exported so an app can extend a
// list (`ignoreDirs: [...DEFAULT_IGNORE_DIRS, 'myThing']`) instead of restating
// it. Chosen so a no-UI, single-`dist` app needs little or no config.

/** Only these extensions affect a build output; everything else is noise. */
export const DEFAULT_INPUT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.svg'];

/**
 * Directory names that are never build inputs (outputs, deps, vcs, caches, test
 * artifacts, scratch). The `.*` / `___*` / `*.ignore*` globs cover dotdirs, the
 * repo-local scratch convention, and `*.ignore` throwaway dirs respectively —
 * the last one is the fix for test-report dirs leaking into the manifest.
 */
export const DEFAULT_IGNORE_DIRS = [
  'node_modules',
  'dist',
  'dist-ssr',
  'build',
  'coverage',
  'binaries',
  'sqlite',
  'test-results',
  'playwright-report',
  'blob-report',
  '__e2e',
  '__functional_tests',
  '.*',
  '___*',
  '*.ignore*',
];

/** File names that are never build inputs (dotfiles, scratch, sourcemaps, logs). */
export const DEFAULT_IGNORE_FILES = ['.*', '___*', '*.ignore*', '*.map', '*.log'];

/**
 * Repo-root files that drive every target's build: the dependency lockfile (any
 * of the common ones), the root package.json (where build scripts live), and the
 * root tsconfig(s). Missing ones are silently skipped.
 */
export const DEFAULT_ROOT_INPUTS = [
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'yarn.lock',
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
];

/** The build output directory name, relative to a target. */
export const DEFAULT_OUTPUT_DIR_NAME = 'dist';

/** Subpath under `node_modules` where manifests live by default. */
export const DEFAULT_MANIFEST_SUBDIR = 'node_modules/.cache/cwip-build';
