// make node compatible files
// run with:
// bun bunBuild.js

import path from 'path';
import fs from 'fs';

// NodeJS Build
const NODE_FIX =
  'import { createRequire as createImportMetaRequire } from "module"; import.meta.require ||= (id) => createImportMetaRequire(import.meta.url)(id);\n';
const BUILD_DIR = 'dist';

const config = {
  entrypoints: ['./index.ts'],
  target: 'node',
  minify: true,
};

const build = await Bun.build(config);

console.log('updating ', build.outputs.length, 'files');

// Write output files
for (const result of build.outputs) {
  const fileContent = NODE_FIX + (await result.text());
  const destDir = path.join('.', BUILD_DIR);
  const dest = path.join(destDir, result.path);
  fs.existsSync(destDir) || fs.mkdirSync(destDir);
  Bun.write(dest, fileContent);
  console.log('updated file:', dest);
}

if (build.success) {
  console.log('built files successfully!');
} else {
  console.log('build failed:', build);
}
