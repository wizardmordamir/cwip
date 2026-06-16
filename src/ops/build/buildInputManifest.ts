import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { walkDir } from '../../web/node/directory/walkDir';
import { DEFAULT_IGNORE_DIRS, DEFAULT_IGNORE_FILES, DEFAULT_INPUT_EXTENSIONS, DEFAULT_ROOT_INPUTS } from './defaults';
import { resolveProjectRoot } from './resolveProjectRoot';
import type { BuildCacheOptions, BuildManifest } from './types';

// Manifest keys are always `projectRoot`-relative POSIX paths, so a manifest
// written on one OS diffs cleanly against one read on another.
const toKey = (root: string, full: string): string => relative(root, full).split(sep).join('/');

const hashFile = async (path: string): Promise<string> =>
  createHash('md5')
    .update(await readFile(path))
    .digest('hex');

// Hash `full` into the manifest under `key` (or its root-relative path); silently
// skip when the file is absent (e.g. an optional lockfile or .env).
const hashInto = async (manifest: BuildManifest, root: string, full: string, key?: string): Promise<void> => {
  try {
    manifest[key ?? toKey(root, full)] = await hashFile(full);
  } catch {
    // not present — skip
  }
};

// `.env`/`.env.*` files in `dir`, by name (none if the dir can't be read).
const envFileNames = async (dir: string): Promise<string[]> => {
  try {
    return (await readdir(dir)).filter((name) => name === '.env' || name.startsWith('.env.'));
  } catch {
    return [];
  }
};

/**
 * Fingerprint a build target's inputs into a manifest of `path -> contentHash`.
 *
 * Inputs are the target's own source tree (filtered to `inputExtensions`, with
 * `ignoreDirs`/`ignoreFiles` pruned and symlinks never followed), plus any
 * `extraDirs` (e.g. a symlinked `shared/`, hashed via its real path), plus the
 * repo-root `rootInputs` (lockfile/package.json/tsconfig) and `.env*` files —
 * all of which can change what a build produces. Build outputs and dependencies
 * are deliberately excluded so the signal isn't polluted by what the build makes.
 */
export const buildInputManifest = async (options: BuildCacheOptions): Promise<BuildManifest> => {
  const inputExtensions = options.inputExtensions ?? DEFAULT_INPUT_EXTENSIONS;
  const ignoreDirs = options.ignoreDirs ?? DEFAULT_IGNORE_DIRS;
  const ignoreFiles = options.ignoreFiles ?? DEFAULT_IGNORE_FILES;
  const rootInputs = options.rootInputs ?? DEFAULT_ROOT_INPUTS;
  const envFiles = options.envFiles ?? true;
  const extraDirs = options.extraDirs ?? [];

  const projectRoot = await resolveProjectRoot(process.cwd(), options.projectRoot);
  const targetPath = resolve(projectRoot, options.target);

  const manifest: BuildManifest = {};
  const isInput = (path: string): boolean => inputExtensions.some((ext) => path.endsWith(ext));
  const walkOptions = { ignoreDirs, ignoreFiles, followSymlinks: false };

  // The target tree plus any extra input roots (e.g. a symlinked `shared/`).
  // Each is walked by its real path so shared code is hashed exactly once.
  for (const dir of [targetPath, ...extraDirs.map((d) => resolve(projectRoot, d))]) {
    for (const full of await walkDir(dir, walkOptions)) {
      if (isInput(full)) await hashInto(manifest, projectRoot, full);
    }
  }

  // Repo-root files that drive every build, keyed by their root-relative name.
  for (const name of rootInputs) {
    await hashInto(manifest, projectRoot, resolve(projectRoot, name), name);
  }

  // Env files are baked into builds but excluded from the tree walk (dotfiles),
  // so hash them explicitly at both the target dir and the repo root.
  if (envFiles) {
    for (const base of new Set([targetPath, projectRoot])) {
      for (const name of await envFileNames(base)) {
        await hashInto(manifest, projectRoot, resolve(base, name));
      }
    }
  }

  return manifest;
};
