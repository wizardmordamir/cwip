import path from 'node:path';
import fs from 'node:fs';
import { fileExists, isDir } from '../../../src/node';

/**
 * 🛠️ VALIDATE FILES (EXPORT AUDIT)
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Performs a deep audit of your 'index.ts' barrel files to ensure they are 
 *    in sync with the actual files on your disk.
 * 2. Rule-Based Filtering: Uses a set of inclusion rules to ignore tests, 
 *    hidden files, markdown, and node_modules during the check.
 * 3. Cross-Reference Check: Compares the list of "exportable" files in a 
 *    directory against the actual 'export' statements found in that directory's index.
 * 4. Recursive Reporting: Walks through the entire tree, logging specific 
 *    mismatches where a file exists on disk but is missing from the index.
 * 
 * WHY RUN THIS?
 * Even with automation, it's easy to manually add a file and forget to export it. 
 * This script acts as a "Linter for your Barrels," ensuring your library's 
 * public API is complete and that no new logic is "hidden" from the rest of the app.
 * 
 * SAFETY:
 * - READ-ONLY: Only reads files and logs discrepancies; never modifies code.
 * - Precision: Uses regex to identify both standard and type-based exports.
 */


/**
 * ⚙️ CONFIGURATION
 */
const AUDIT_TARGET = './src'; // Change this to specific folders like './src/array' if needed
const LOG_RECURSION = false;  // Set to true if you want to see every folder being entered

type InclusionRule = (name: string) => boolean;

const inclusionRules: InclusionRule[] = [
  (name) => name !== 'index.ts',
  (name) => !name.startsWith('.'),
  (name) => !name.endsWith('.test.ts'),
  (name) => !name.endsWith('.spec.ts'),
  (name) => !name.endsWith('.d.ts'),
  (name) => !name.endsWith('.md'),
  (name) => !name.includes('.ignore'),
  (name) => name !== 'node_modules',
  (name) => name !== '__snapshots__',
  (name) => name !== '_internal',
  (name) => name !== 'node',
];

const validateDirectory = async (targetDir: string): Promise<void> => {
  const items = await fs.promises.readdir(targetDir)
    .then((arr: string[]) => arr.map((itemPath) => ({
      name: path.basename(itemPath),
      isDirectory: () => isDir(itemPath)
    })))

  const exportableItems = items.filter((item) =>
    inclusionRules.every((rule) => rule(item.name))
  );

  const indexExists = await fileExists(path.join(targetDir, 'index.ts'));

  if (indexExists) {
    const indexFilePath = path.join(targetDir, 'index.ts');
    const content = await fs.promises.readFile(indexFilePath).then(buffer => buffer.toString());

    const exportRegex = /export .* from\s+['"]\.\/([^'"]+)['"]/g;
    const exportedPaths: string[] = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exportedPaths.push(match[1]);
    }

    const diskItemNames = exportableItems.map(item =>
      item.name.replace(/\.(ts|tsx|js|jsx)$/, '')
    );

    const missing = diskItemNames.filter(name => !exportedPaths.includes(name));
    const extras = exportedPaths.filter(name => !diskItemNames.includes(name));

    if (missing.length > 0 || extras.length > 0) {
      console.log(`❌ Mismatch in ${targetDir}`);
      if (missing.length) console.log(`   Missing from index: ${missing.join(', ')}`);
      if (extras.length) console.log(`   Extra in index:    ${extras.join(', ')}`);
    } else {
      console.log(`✅ ${targetDir} is valid.`);
    }
  }

  for (const item of exportableItems) {
    try {
      const fullPath = path.join(targetDir, item.name);
      if (await isDir(fullPath)) {
        if (LOG_RECURSION) console.log(`Recursing into: ${fullPath}`);
        await validateDirectory(fullPath);
      }
    } catch (err) {
      console.error(`Error processing ${item.name}:`, err);
    }
  }
};

const main = async () => {
  console.log(`--- Starting Audit on ${AUDIT_TARGET} ---`);
  await validateDirectory(AUDIT_TARGET);
}

main().finally(() => console.log('--- Validation Complete ---'));
