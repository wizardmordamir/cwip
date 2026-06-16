import path from 'node:path';
import { BASE_PATH } from './constants';

export const makePathStringFromAppRoot = (...paths: string[]): string => {
  return path.join(BASE_PATH, ...paths);
};
