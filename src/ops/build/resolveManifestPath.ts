import { basename, isAbsolute, join, resolve } from 'node:path';
import { DEFAULT_MANIFEST_SUBDIR } from './defaults';
import { resolveProjectRoot } from './resolveProjectRoot';
import type { BuildCacheOptions } from './types';

/**
 * The on-disk path of a target's manifest file. One file per target, named by
 * the target's basename (`server` → `server.json`), so `server` and `ui` never
 * clobber each other. Lives under `manifestDir` (default
 * `<projectRoot>/node_modules/.cache/cwip-build`).
 */
export const resolveManifestPath = async (options: BuildCacheOptions): Promise<string> => {
  const projectRoot = await resolveProjectRoot(process.cwd(), options.projectRoot);
  const manifestDir = options.manifestDir
    ? isAbsolute(options.manifestDir)
      ? options.manifestDir
      : resolve(projectRoot, options.manifestDir)
    : join(projectRoot, DEFAULT_MANIFEST_SUBDIR);
  const targetPath = resolve(projectRoot, options.target);
  return join(manifestDir, `${basename(targetPath)}.json`);
};
