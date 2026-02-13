import fs from 'node:fs';
import { tryOr, tryOrAsync } from '../tryOr';

export const isSymLinkSync = (path: string): boolean => {
  return tryOr(() => fs.statSync(path).isSymbolicLink(), false);
};

export const isSymLink = async (path: string): Promise<boolean> => {
  return tryOrAsync(() => fs.promises.stat(path).then((stats) => stats.isSymbolicLink()), false);
};
