import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { matchesGlob } from '../../../core/string';

export interface WalkDirOptions {
  /** Directory names/globs to skip entirely (e.g. `['node_modules', '.git', '*.skip*']`). */
  ignoreDirs?: string[];
  /** File names/globs to skip (e.g. `['.DS_Store', '*.log']`). */
  ignoreFiles?: string[];
  /**
   * Follow symbolic links to directories and files, like `find -L`. Default true.
   * Broken links are skipped. Note: no cycle detection — don't follow links that
   * point back up the tree.
   */
  followSymlinks?: boolean;
  /** Called for any directory that can't be read (default: swallow and continue). */
  onError?: (error: unknown, path: string) => void;
}

/**
 * Recursively walks a directory and returns the absolute paths of every file
 * found, with directory/file ignore-lists and optional symlink following.
 *
 * Entries are visited in sorted order within each directory, so the returned
 * list is deterministic regardless of the OS's readdir ordering. Directories
 * themselves are not included — only files.
 *
 * Uses `node:fs/promises` directly (not the `node:fs` surface cwip/testing
 * virtualizes), so it always touches the real filesystem.
 *
 * @example
 * const files = await walkDir(srcDir, {
 *   ignoreDirs: ['node_modules', 'dist', '.git'],
 *   ignoreFiles: ['*.log', '.DS_Store'],
 * });
 */
export const walkDir = async (root: string, options: WalkDirOptions = {}): Promise<string[]> => {
  const { ignoreDirs = [], ignoreFiles = [], followSymlinks = true, onError } = options;
  const out: string[] = [];

  const visit = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
      onError?.(error, dir);
      return null;
    });
    if (!entries) return;

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();

      if (entry.isSymbolicLink()) {
        if (!followSymlinks) continue;
        try {
          const realStats = await stat(fullPath); // resolves the link target
          isDirectory = realStats.isDirectory();
          isFile = realStats.isFile();
        } catch (error) {
          onError?.(error, fullPath); // broken link — skip it
          continue;
        }
      }

      if (isDirectory) {
        if (matchesGlob(entry.name, ignoreDirs)) continue;
        await visit(fullPath);
      } else if (isFile) {
        if (matchesGlob(entry.name, ignoreFiles)) continue;
        out.push(fullPath);
      }
    }
  };

  await visit(root);
  return out;
};
