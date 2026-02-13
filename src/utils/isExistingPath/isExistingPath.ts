import fs from 'node:fs';
import { tryOr, tryOrAsync } from '../tryOr';

export const isExistingPathSync = (path: string): boolean => {
  return tryOr(() => fs.existsSync(path), false);
};

export const isExistingPath = async (path: string): Promise<boolean> => {
  return tryOrAsync(() => fs.promises.exists(path), false);
};
