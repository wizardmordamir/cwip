import fs from 'node:fs';
import { joinPath } from './joinPath';

export const getDirPaths = async (dir: string): Promise<string[]> => {
  const files = await fs.promises.readdir(dir, { encoding: 'utf8' });
  return files.map((file) => joinPath(dir)(file));
};
