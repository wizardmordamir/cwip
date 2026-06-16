import fs from 'node:fs';

export const writeFile = (filePath: string, options?: fs.WriteFileOptions) => async (content: string) =>
  fs.promises.writeFile(filePath, content, options);
