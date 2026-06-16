import fs from 'node:fs';

export const isDirUnsafe = (dirPath: string) => fs.promises.stat(dirPath).then((stat) => stat.isDirectory());
