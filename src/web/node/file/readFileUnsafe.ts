import fs from 'node:fs';

export const readFileUnsafe = (item: string) => fs.promises.readFile(item, 'utf-8');
