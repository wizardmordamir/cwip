import fs from 'node:fs';
import { tryOrAsync } from '../../../core/utils';

export const lstatSafe = async (path: string): Promise<import('node:fs').Stats | null> => {
  return tryOrAsync(() => fs.promises.lstat(path), null);
};
