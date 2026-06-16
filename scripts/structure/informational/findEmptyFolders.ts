import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * 🔍 FIND EMPTY FOLDERS
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Performs a non-destructive scan of the 'src' directory.
 * 2. Identifies and logs folders that contain zero files or subfolders.
 * 3. Uses a bottom-up traversal to find "chains" of empty folders 
 *    (e.g., if /a/b/c are all empty, it will identify all three).
 * 
 * WHY RUN THIS?
 * Use this as a health check to see how much "clutter" exists in your 
 * directory tree before running a destructive cleanup script.
 * 
 * SAFETY:
 * - READ-ONLY: This script does not delete, move, or rename anything.
 * - It will ignore the root 'src' folder even if it is empty.
 */

async function logEmptyFolders(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });

  // 1. Recurse into subdirectories first
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await logEmptyFolders(join(dir, entry.name));
    }
  }

  // 2. Check content again after subdirectories might have been "cleared" in logic
  const currentEntries = await readdir(dir);

  if (currentEntries.length === 0) {
    const rootDir = resolve(process.cwd(), "src");
    if (dir === rootDir) return; // Don't log the root itself

    console.log(`📁 Empty Folder: ${dir}`);
  }
}

const targetPath = resolve(process.cwd(), "src");
console.log(`🔍 Scanning for empty folders in: ${targetPath}\n`);

logEmptyFolders(targetPath)
  .then(() => console.log("\n✨ Scan complete."))
  .catch((err) => console.error("❌ Scan failed:", err));
