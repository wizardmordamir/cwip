import fs from 'node:fs';
import path from 'node:path';
import { lstatSafe, removePath } from '../path';
import { makePathStringFromAppRoot } from '../path/resolve';

/**
 * Creates a directory from scratch, returning a Task for the StateMonad.
 */
export const createDirTask = (...pathSegments: string[]) => {
  return async (_contextValue: any): Promise<string> => {
    const fullPath = path.isAbsolute(pathSegments[0])
      ? path.join(...pathSegments)
      : makePathStringFromAppRoot(...pathSegments);

    // 1. Destructive Step
    removePath(fullPath);

    // 2. Safety Check
    const stat = await lstatSafe(fullPath);
    if (stat) {
      throw new Error(`Cleanup failed: ${fullPath} still exists.`);
    }

    // 3. Recreation
    fs.mkdirSync(fullPath, { recursive: true });

    return fullPath;
  };
};
