import { readdir, rmdir, unlink, readFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * 🧹 CLEAN EMPTY & INDEX-ONLY FOLDERS
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Deep-cleans 'src' by removing folders that are truly empty.
 * 2. Targets "Index-Only" folders: If a folder only contains an index.ts, the 
 *    script checks if that index is just a barrel (exports) or contains logic.
 * 3. Deletes 'index.ts' if it's empty or a standard barrel, allowing the 
 *    parent folder to be deleted.
 * 4. Safe-renames 'index.ts' to '<function-name>.ts' if it contains actual 
 *    logic, preventing accidental deletion of code.
 * 
 * WHY RUN THIS?
 * To prune the directory tree after refactoring or splintering files. It 
 * ensures you don't have nested empty directories or logic hidden inside 
 * generic 'index.ts' filenames.
 * 
 * SAFETY:
 * - Always run 'Index Sync' after this to rebuild necessary barrel files.
 * - Protects 'src/index.ts' from being modified.
 */
async function getLogicFileInfo(filePath: string) {
  const content = await readFile(filePath, "utf-8");
  const trimmed = content.trim();
  
  // 1. Better Barrel Check: Only consider it a "barrel" if it ONLY contains export * lines
  const lines = trimmed.split('\n').filter(l => l.trim() !== "");
  const barrelPattern = /^export \* from '\.\/.*';$/;
  const isBarrel = lines.length > 0 && lines.every(l => barrelPattern.test(l.trim()));

  // 2. Improved Name Extraction: Looks for function, const, let, or var exports
  const exportMatch = content.match(/export (?:async )?(?:function|const|let|var)\s+(\w+)/);
  const funcName = exportMatch ? exportMatch[1] : "index-logic";

  return { isBarrel, funcName, isEmpty: trimmed === "" };
}

function getTimestampedName(name: string) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toLocaleTimeString('en-US', { 
    hour12: true, hour: '2-digit', minute: '2-digit' 
  }).replace(/[:\s]/g, '-').toLowerCase();
  return `${name}-${date}-${time}.ts`;
}

async function cleanEmptyAndIndexOnlyFolders(dir: string, rootDir: string) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) await cleanEmptyAndIndexOnlyFolders(join(dir, entry.name), rootDir);
  }

  let currentEntries = await readdir(dir);

  if (currentEntries.includes("index.ts")) {
    const indexPath = join(dir, "index.ts");
    
    // SAFETY: Never touch src/index.ts
    if (indexPath === join(rootDir, "index.ts")) return;

    const { isBarrel, funcName, isEmpty } = await getLogicFileInfo(indexPath);

    if (isEmpty) {
      await unlink(indexPath);
      currentEntries = currentEntries.filter(e => e !== "index.ts");
      console.log(`🗑️ Removed empty index: ${indexPath}`);
    } 
    else if (!isBarrel) {
      // It's logic! Rename it to the actual function name
      let targetName = `${funcName}.ts`;
      if (currentEntries.includes(targetName)) {
        targetName = getTimestampedName(funcName);
      }
      
      const newPath = join(dir, targetName);
      await rename(indexPath, newPath);
      currentEntries = currentEntries.map(e => e === "index.ts" ? targetName : e);
      console.log(`🏷️ Renamed: ${indexPath} -> ${targetName}`);
    }
    // Note: We no longer delete barrel files (isBarrel) because your structure needs them!
  }

  // Delete folder ONLY if truly empty
  if (currentEntries.length === 0 && dir !== rootDir) {
    await rmdir(dir);
    console.log(`📁 Deleted empty folder: ${dir}`);
  }
}

const srcPath = resolve(process.cwd(), "src");
cleanEmptyAndIndexOnlyFolders(srcPath, srcPath).catch(console.error);
