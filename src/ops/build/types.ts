// Shared types for the incremental build cache (cwip/build).

export interface BuildCacheOptions {
  /**
   * The build target to fingerprint, relative to `projectRoot` (or absolute).
   * Examples: `'server'`, `'ui'`, `'.'` for a single-target repo.
   */
  target: string;
  /**
   * Repo root used to resolve `target`/`extraDirs`/`rootInputs` and to key every
   * manifest entry. Defaults to the git toplevel of the cwd, falling back to the
   * cwd itself when not in a git repo.
   */
  projectRoot?: string;
  /** File extensions that count as build inputs; everything else is noise. */
  inputExtensions?: string[];
  /** Directory-name globs to skip while walking (matched against basenames). */
  ignoreDirs?: string[];
  /** File-name globs to skip while walking (matched against basenames). */
  ignoreFiles?: string[];
  /**
   * Repo-root files that drive every target's build (lockfile, package.json,
   * tsconfig). Hashed explicitly because they live above the target tree.
   */
  rootInputs?: string[];
  /**
   * Hash `.env`/`.env.*` files at the target and repo root. Build tools bake
   * these in (vite's `VITE_*`, bun's `--env`), so a change must bust the cache.
   * They are dotfiles excluded from the tree walk, hence hashed separately.
   */
  envFiles?: boolean;
  /**
   * Output directory name under the target. A check forces a rebuild when this
   * is missing or empty regardless of input hashes (nothing built to run/serve).
   */
  outputDirName?: string;
  /**
   * Extra input roots beyond the target tree, relative to `projectRoot` (or
   * absolute). Use this for code the target consumes through a symlink (e.g. a
   * shared `shared/` dir) — symlinks are never followed, so the real path must be
   * listed here or its changes won't bust the cache.
   */
  extraDirs?: string[];
  /**
   * Where per-target manifests are stored. Defaults to
   * `<projectRoot>/node_modules/.cache/cwip-build` — the conventional tool-cache
   * location (untracked, and auto-cleared by a dependency reinstall).
   */
  manifestDir?: string;
}

/** Per-app config for `runBuildCacheCli` — every option except the target, which the CLI reads from argv. */
export type BuildCacheConfig = Omit<BuildCacheOptions, 'target'>;

/** A manifest maps each input file's `projectRoot`-relative POSIX path to its content hash. */
export type BuildManifest = Record<string, string>;

/** The per-file differences between two manifests. */
export interface ManifestDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

/** The result of a freshness check. */
export interface BuildCacheStatus {
  /** True when the build can be safely skipped. */
  fresh: boolean;
  /** Why the answer is what it is (for logging). */
  reason: 'no-output' | 'no-manifest' | 'unchanged' | 'changed';
  /** The manifest diff (empty for `no-output`/`no-manifest`). */
  diff: ManifestDiff;
}
