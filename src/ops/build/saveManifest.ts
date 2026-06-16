import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BuildManifest } from './types';

/** Write a manifest to disk as compact JSON, creating its directory if needed. */
export const saveManifest = async (path: string, manifest: BuildManifest): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(manifest));
};
