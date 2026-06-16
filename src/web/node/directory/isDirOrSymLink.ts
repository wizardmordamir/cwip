import fs from 'node:fs';

export const isDirOrSymLink = async (path: string): Promise<boolean> => {
  try {
    const stats = await fs.promises.lstat(path);
    return stats.isDirectory() || stats.isSymbolicLink();
  } catch {
    return false;
  }
};
