import { readdir, writeFile, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";

/**
 * 🚀 REMAKE INDEXES (BARREL GENERATOR)
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Deep-scans the 'src' directory tree.
 * 2. In every folder, it generates or updates an 'index.ts' file.
 * 3. Automatically adds 'export * from "./file"' for every .ts file in that folder.
 * 4. Automatically adds 'export * from "./subfolder"' to pass exports up the tree.
 * 5. Sorts all exports alphabetically and compares content to avoid unnecessary writes.
 * 
 * WHY RUN THIS?
 * After splintering files or renaming logic, your directory structure changes. 
 * This script ensures that your "barrel" exports are 100% accurate, allowing 
 * you to import functions from clean directory paths rather than individual files.
 * 
 * SAFETY:
 * - 💎 Logs "Synced" if the index is already perfect.
 * - ✨ Logs "Updated" only if changes were made.
 * - Respects ignore patterns (e.g., .spec.ts, .test.ts, .ignore.ts).
 */


const ignoreFilesSubstrings = ['.ignore', '.spec.', '.test.', 'index.ts'];

async function syncDirectoryIndexes(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });

  const tsFiles = entries
    .filter(entry => 
      entry.isFile() && 
      extname(entry.name) === '.ts' && 
      !ignoreFilesSubstrings.some(sub => entry.name.includes(sub))
    )
    .map(entry => ({ name: basename(entry.name, '.ts') }));

  const subDirs = entries
    .filter(entry => 
      entry.isDirectory() && 
      !entry.name.startsWith('.') &&
      !ignoreFilesSubstrings.some(sub => entry.name.includes(sub))
    )
    .map(entry => ({ name: entry.name }));

const allExports = [...tsFiles, ...subDirs].sort((a, b) => {
  const nameA = a.name;
  const nameB = b.name;
  const len = Math.min(nameA.length, nameB.length);

  for (let i = 0; i < len; i++) {
    const charA = nameA[i];
    const charB = nameB[i];

    if (charA === charB) continue;

    const lowA = charA.toLowerCase();
    const lowB = charB.toLowerCase();

    if (lowA !== lowB) {
      // Different letters: Use standard alphabetical order (a before b)
      return lowA < lowB ? -1 : 1;
    }

    // Same letter, different case: Uppercase (e.g., 'S') comes before Lowercase ('s')
    // In Unicode, 'S' (83) is less than 's' (115)
    return charA < charB ? -1 : 1;
  }

  // If one string is a prefix of the other, the shorter one wins
  return nameA.length - nameB.length;
});


  if (allExports.length > 0) {
    const indexPath = join(dir, "index.ts");
    const newContent = allExports
      .map(item => `export * from './${item.name}';`)
      .join('\n') + '\n';

    let existingContent = "";
    try {
      existingContent = await readFile(indexPath, "utf-8");
    } catch {
      // File doesn't exist, which is fine
    }

    if (existingContent !== newContent) {
      await writeFile(indexPath, newContent, "utf-8");
      console.log(`✨ Updated: ${indexPath}`);
    } else {
      console.log(`💎 Synced:  ${indexPath}`);
    }
  }

  for (const subDir of subDirs) {
    await syncDirectoryIndexes(join(dir, subDir.name));
  }
}

const rootDir = join(process.cwd(), "src");
syncDirectoryIndexes(rootDir)
  .then(() => console.log("\n🚀 All indexes processed!"))
  .catch(err => console.error("❌ Sync failed:", err));
