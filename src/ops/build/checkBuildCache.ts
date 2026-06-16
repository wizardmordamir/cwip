import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildInputManifest } from './buildInputManifest';
import { DEFAULT_OUTPUT_DIR_NAME } from './defaults';
import { diffManifests } from './diffManifests';
import { loadManifest } from './loadManifest';
import { resolveManifestPath } from './resolveManifestPath';
import { resolveProjectRoot } from './resolveProjectRoot';
import type { BuildCacheOptions, BuildCacheStatus } from './types';

// True if the target's output dir exists and contains at least one entry. An
// inputs-only manifest can't tell that someone deleted `dist`, so a check must
// also fail when there's nothing built to run or serve.
const outputIsPresent = async (targetPath: string, outputDirName: string): Promise<boolean> => {
  try {
    return (await readdir(join(targetPath, outputDirName))).length > 0;
  } catch {
    return false;
  }
};

const EMPTY_DIFF = { added: [], removed: [], changed: [] };

/**
 * Decide whether a build target can be skipped. Not fresh (rebuild) when the
 * output dir is missing/empty, when there's no saved manifest, or when any input
 * file was added/removed/changed since the manifest was saved. The output-dir
 * check runs first so a deleted `dist` always forces a rebuild regardless of
 * input hashes.
 */
export const checkBuildCache = async (options: BuildCacheOptions): Promise<BuildCacheStatus> => {
  const projectRoot = await resolveProjectRoot(process.cwd(), options.projectRoot);
  const opts = { ...options, projectRoot };
  const targetPath = resolve(projectRoot, opts.target);
  const outputDirName = opts.outputDirName ?? DEFAULT_OUTPUT_DIR_NAME;

  if (!(await outputIsPresent(targetPath, outputDirName))) {
    return { fresh: false, reason: 'no-output', diff: EMPTY_DIFF };
  }

  const prev = await loadManifest(await resolveManifestPath(opts));
  if (!prev) return { fresh: false, reason: 'no-manifest', diff: EMPTY_DIFF };

  const diff = diffManifests(prev, await buildInputManifest(opts));
  const fresh = diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
  return { fresh, reason: fresh ? 'unchanged' : 'changed', diff };
};
