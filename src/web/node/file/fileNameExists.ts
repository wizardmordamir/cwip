import path from 'node:path';
import { fileExists } from './fileExists';

export const fileNameExists = (filename: string) => (dir: string) => fileExists(path.join(dir, filename));
