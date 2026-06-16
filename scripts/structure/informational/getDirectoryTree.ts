import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * 🗺️ GENERATE STRUCTURE MAP
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Recursively crawls the 'src' directory to map out the entire file system.
 * 2. Generates a JSON representation of the tree, grouping folders first, then files.
 * 3. Alphabetically sorts all entries at every level for a consistent, readable map.
 * 4. Filters out hidden files (starting with '.') and anything matching your 
 *    ignore patterns (e.g., .spec, .test, .ignore).
 * 5. Saves the final map to 'scripts/reports/structure.ignore.json'.
 * 
 * WHY RUN THIS?
 * Use this to get a bird's-eye view of your project's architecture. It’s perfect 
 * for documenting the repo, providing context to LLMs, or verifying that your 
 * folder cleanup and splintering efforts have resulted in a clean tree.
 * 
 * SAFETY:
 * - READ-ONLY: This script does not modify any source code or directory names.
 * - The output file is named with '.ignore' to ensure it doesn't accidentally 
 *   include itself in the next scan.
 */


const ignorePatterns: RegExp[] = [/\.ignore/, /\.spec\./, /\.test\./];

async function getDirectoryTree(dir: string): Promise<Record<string, any>> {
  const entries = await readdir(dir, { withFileTypes: true });

  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const tree: Record<string, any> = {};

  for (const entry of sortedEntries) {
    // 1. Skip hidden files
    if (entry.name.startsWith(".")) continue;

    // 2. Skip ignored substrings
    // This checks if any string in your ignore list exists within the filename/foldername
    if (ignorePatterns.some(pattern => pattern.test(entry.name))) {
      continue;
    }

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      tree[entry.name] = await getDirectoryTree(fullPath);
    } else {
      tree[entry.name] = "file";
    }
  }

  return tree;
}

async function run() {
  const rootFolderName = "src";
  const targetPath = join(process.cwd(), rootFolderName);
  const outputFile = "scripts/reports/fileTree.json";

  try {
    const tree = await getDirectoryTree(targetPath);
    const finalOutput = { [rootFolderName]: tree };
    await mkdir(dirname(outputFile), { recursive: true }); // Ensure the directory exists
    await writeFile(outputFile, JSON.stringify(finalOutput, null, 2), "utf-8"); // Write the file
    console.log(`✅ Alphabetically sorted JSON saved to ${outputFile}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

run();
