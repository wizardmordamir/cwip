import path from 'node:path';

export const joinPath = (baseDir: string) => (v: string) => path.join(baseDir, v);
