import fs from 'node:fs';

export const removePathSync = (path: string, config: any = {}): void => {
  try {
    // Use rmSync with recursive and force options to remove files/directories/symlinks
    fs.rmSync(path, { force: true, recursive: true, maxRetries: 3, retryDelay: 100, ...config });
  } catch (error) {
    // Ignore errors, as we want to force remove the path
  }
};

export const removePath = async (path: string, config: any = {}): Promise<void> => {
  try {
    // Use rm with recursive and force options to remove files/directories/symlinks
    await fs.promises.rm(path, {
      force: true,
      recursive: true,
      maxRetries: 3,
      retryDelay: 100,
      ...config,
    });
  } catch (error) {
    // Ignore errors, as we want to force remove the path
  }
};
