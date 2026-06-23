import { rm } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { boolEnv } from '../../web/node/env/optionalEnv';
import { buildInputManifest } from './buildInputManifest';
import { checkBuildCache } from './checkBuildCache';
import { DEFAULT_MANIFEST_SUBDIR, FORCE_FLAGS, NO_CACHE_ENV } from './defaults';
import { resolveManifestPath } from './resolveManifestPath';
import { resolveProjectRoot } from './resolveProjectRoot';
import { saveManifest } from './saveManifest';
import type { BuildCacheConfig, BuildCacheOptions } from './types';

const VERBS = ['check', 'save', 'clean'] as const;
const FORCE_FLAG_SET = new Set<string>(FORCE_FLAGS);

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
 *
 * Forcing a real rebuild (never trust a cached green). A `check` always reports
 * "build needed" (exit 1) when the {@link NO_CACHE_ENV} env var is truthy OR a
 * force flag ({@link FORCE_FLAGS}: `--force` / `--no-cache` / `-f`) is passed.
 * Use this at a green gate and across every merge/promotion boundary, where a
 * stale-cache skip could certify broken output as green — the env var flips the
 * whole gate/merge process at once, the flag forces a single call. `save`/`clean`
 * are unaffected, so the cache still warms the inner loop after a forced build.
 */
export const runBuildCacheCli = async (
  config: BuildCacheConfig = {},
  argv: string[] = process.argv.slice(2),
): Promise<number> => {
  // Split flags from positionals so a force flag may appear anywhere (e.g.
  // `check --force ui` or `check ui --no-cache`), then read verb + target.
  const forced = argv.some((arg) => FORCE_FLAG_SET.has(arg)) || boolEnv(NO_CACHE_ENV);
  const positionals = argv.filter((arg) => !arg.startsWith('-'));
  const verb = positionals[0];
  const dir = positionals[1];

  if (!verb || !(VERBS as readonly string[]).includes(verb)) {
    console.error(`buildCache: usage: <${VERBS.join('|')}> [dir] [--force]`);
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

  // check — at a green gate or merge/promotion boundary the cache must not be
  // trusted: force a rebuild so "green" only ever means "actually rebuilt".
  if (forced) {
    const why = boolEnv(NO_CACHE_ENV) ? `${NO_CACHE_ENV} set` : 'force flag';
    console.log(`buildCache: cache bypassed (${why}) for "${dir}" -> build needed`);
    return 1;
  }

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
