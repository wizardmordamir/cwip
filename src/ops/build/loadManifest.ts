import { readFile } from 'node:fs/promises';
import type { BuildManifest } from './types';

/**
 * Load a saved manifest, or `null` when it's missing, unreadable, or not a valid
 * object (e.g. a corrupt or legacy single-hash file). A `null` is treated as "no
 * cache" by `checkBuildCache` — i.e. build — so a bad manifest never aborts the
 * build pipeline, it just forces a rebuild.
 */
export const loadManifest = async (path: string): Promise<BuildManifest | null> => {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as BuildManifest;
  } catch {
    return null;
  }
};
