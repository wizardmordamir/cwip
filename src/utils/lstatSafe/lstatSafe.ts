import fs from 'node:fs';
import { tryOr, tryOrAsync } from '../tryOr';
import type { Stats } from 'node:fs';

export const lstatSafeSync = (path: string): Stats | null => {
  return tryOr(() => fs.lstatSync(path), null);
};

export const lstatSafe = async (path: string): Promise<import('node:fs').Stats | null> => {
  return tryOrAsync(() => fs.promises.lstat(path), null);
};
