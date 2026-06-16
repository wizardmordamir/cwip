import fs from 'node:fs';
import { tryOrAsync } from '../../../core/utils';

export const isExistingPath = async (path: string): Promise<boolean> => {
  return tryOrAsync(async () => {
    await fs.promises.access(path);
    return true;
  }, false);
};
