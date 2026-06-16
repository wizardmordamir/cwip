import type { BuildManifest, ManifestDiff } from './types';

/**
 * Compare two manifests and return the per-file differences: keys present only in
 * `next` (added), only in `prev` (removed), or whose hash differs (changed). An
 * all-empty result means the inputs are unchanged.
 */
export const diffManifests = (prev: BuildManifest, next: BuildManifest): ManifestDiff => {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const key of Object.keys(next)) {
    if (!(key in prev)) added.push(key);
    else if (prev[key] !== next[key]) changed.push(key);
  }
  for (const key of Object.keys(prev)) {
    if (!(key in next)) removed.push(key);
  }

  return { added, removed, changed };
};
