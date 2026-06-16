import { readdir, rename, unlink, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * 🏠 HOIST UTILS
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Scans 'src/utils' for subdirectories.
 * 2. Moves any '.ts' or '.spec.ts' files from the subfolder up into 'src/utils'.
 * 3. Deletes the 'index.ts' file inside the subfolder.
 * 4. Deletes the now-empty subfolder.
 * 
 * WHY RUN THIS?
 * To move from a "folder-per-function" structure to a flat "file-per-function" 
 * structure in your utils directory.
 */

async function hoistUtils() {
  const utilsDir = resolve(process.cwd(), "src/utils");

  const entries = await readdir(utilsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subDirPath = join(utilsDir, entry.name);
    
    try {
      const subFiles = await readdir(subDirPath);

      for (const file of subFiles) {
        const oldPath = join(subDirPath, file);
        const newPath = join(utilsDir, file);

        if (file === "index.ts") {
          await unlink(oldPath);
        } else if (file.endsWith(".ts")) {
          // Check for collision to prevent skipping/errors
          try {
            await rename(oldPath, newPath);
            console.log(`🚚 Hoisted: ${file}`);
          } catch (e: any) {
            console.warn(`⚠️  Could not move ${file}: ${e.message}`);
          }
        }
      }

      // Cleanup the folder
      const remaining = await readdir(subDirPath);
      if (remaining.length === 0) {
        await rmdir(subDirPath);
        console.log(`🗑️  Deleted folder: ${entry.name}`);
      } else {
        console.warn(`📂 Folder not empty, skipping delete: ${entry.name}`);
      }

    } catch (err: any) {
      console.error(`❌ Failed processing ${entry.name}:`, err.message);
    }
  }
}

hoistUtils();
