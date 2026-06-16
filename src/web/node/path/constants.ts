import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM has no `__dirname`; derive it from import.meta.url so the published package
// works under native Node ESM (and Bun) without relying on the CommonJS global.
const here = path.dirname(fileURLToPath(import.meta.url));

export const BASE_PATH: string = path.join(here, '../../');
