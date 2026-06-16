import fs from 'node:fs';

export const logAndThrowIfExists = (path: string) => {
  if (fs.existsSync(path)) {
    throw new Error(`path ${path} exists`);
  }
};
