import fs from 'node:fs';
import { tryOr, tryOrAsync } from '../tryOr';

export const isDirSync = (path: string): boolean => {
  return tryOr(() => fs.statSync(path).isDirectory(), false);
};

export const isDir = async (path: string): Promise<boolean> => {
  return tryOrAsync(() => fs.promises.stat(path).then((stats) => stats.isDirectory()), false);
};
