import fs from 'node:fs';

export const logAndThrowIfNotExists = (path: string) => {
  if (!fs.existsSync(path)) {
    throw new Error(`path ${path} does not exist`);
  }
};
