import { rm } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { buildInputManifest } from './buildInputManifest';
import { checkBuildCache } from './checkBuildCache';
import { DEFAULT_MANIFEST_SUBDIR } from './defaults';
import { resolveManifestPath } from './resolveManifestPath';
import { resolveProjectRoot } from './resolveProjectRoot';
import { saveManifest } from './saveManifest';
import type { BuildCacheConfig, BuildCacheOptions } from './types';

const VERBS = ['check', 'save', 'clean'] as const;

const logFileList = (label: string, files: string[]): void => {
  if (files.length === 0) return;
  const shown = files.slice(0, 12);
  console.log(`  ${label} (${files.length}): ${shown.join(', ')}${files.length > shown.length ? ', …' : ''}`);
};

/**
 * The CLI behind an app's thin wrapper script. Parses `argv` for a verb + target
 * and runs the matching action against the app's `config`, returning a process
 * exit code (it never calls `process.exit` itself — the wrapper does, which keeps
 * this testable). Verbs:
 *
 *   check <dir>  exit 0 = unchanged (skip build), exit 1 = changed (build needed)
 *   save  <dir>  write the manifest after a successful build, exit 0
 *   clean [dir]  delete one target's manifest, or the whole cache dir, exit 0
 *
 * Usage in package.json:  `bun scripts/buildCache check server || (cd server && bun run build)`
 *                  then:  `… && bun scripts/buildCache save server`
 */
export const runBuildCacheCli = async (
  config: BuildCacheConfig = {},
  argv: string[] = process.argv.slice(2),
): Promise<number> => {
  const verb = argv[0];
  const dir = argv[1];

  if (!verb || !(VERBS as readonly string[]).includes(verb)) {
    console.error(`buildCache: usage: <${VERBS.join('|')}> [dir]`);
    return 2;
  }

  const projectRoot = await resolveProjectRoot(process.cwd(), config.projectRoot);

  if (verb === 'clean') {
    if (dir) {
      await rm(await resolveManifestPath({ ...config, target: dir, projectRoot }), { force: true });
      console.log(`buildCache: cleared manifest for "${dir}"`);
    } else {
      const manifestDir = config.manifestDir
        ? isAbsolute(config.manifestDir)
          ? config.manifestDir
          : resolve(projectRoot, config.manifestDir)
        : join(projectRoot, DEFAULT_MANIFEST_SUBDIR);
      // Safety: a misconfigured `manifestDir` that resolves to the project root
      // (e.g. '.') or an ancestor would turn this recursive clean into wiping the
      // checkout. Refuse rather than rm it.
      if (manifestDir === projectRoot || projectRoot.startsWith(manifestDir + sep)) {
        console.error(
          `buildCache: refusing to clean manifestDir "${manifestDir}" — it is the project root or an ancestor`,
        );
        return 2;
      }
      await rm(manifestDir, { recursive: true, force: true });
      console.log('buildCache: cleared all manifests');
    }
    return 0;
  }

  if (!dir) {
    console.error(`buildCache: "${verb}" needs a target dir`);
    return 2;
  }
  const options: BuildCacheOptions = { ...config, target: dir, projectRoot };

  if (verb === 'save') {
    const manifest = await buildInputManifest(options);
    await saveManifest(await resolveManifestPath(options), manifest);
    console.log(`buildCache: saved manifest for "${dir}" (${Object.keys(manifest).length} input files)`);
    return 0;
  }

  // check
  const status = await checkBuildCache(options);
  if (status.fresh) {
    console.log(`buildCache: no input changes for "${dir}" -> skipping`);
    return 0;
  }
  if (status.reason === 'no-output') {
    console.log(`buildCache: no build output for "${dir}" -> build needed`);
  } else if (status.reason === 'no-manifest') {
    console.log(`buildCache: no manifest for "${dir}" -> build needed`);
  } else {
    console.log(`buildCache: "${dir}" changed -> build needed`);
    logFileList('changed', status.diff.changed);
    logFileList('added', status.diff.added);
    logFileList('removed', status.diff.removed);
  }
  return 1;
};
