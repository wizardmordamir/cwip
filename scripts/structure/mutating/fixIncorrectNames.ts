import { readdir, readFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * 🏷️ FIX INCORRECT NAMES
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Scans the 'src' tree specifically for files with a placeholder name 
 *    (defaults to 'index-logic.ts').
 * 2. Parses the content of those files to find the first named export 
 *    (function, const, class, etc.).
 * 3. Renames the file to match that export name (e.g., index-logic.ts -> identity.ts).
 * 
 * WHY RUN THIS?
 * Use this to recover from "failed" or generic refactors where logic files 
 * ended up with temporary names. It ensures your filenames accurately 
 * reflect the code they contain, which is essential for a clean directory structure.
 * 
 * SAFETY:
 * - Only targets the specific "bad" filename provided.
 * - Skips files where no clear named export can be identified.
 * - Logs every successful rename and any errors (like name collisions).
 */

async function fixIncorrectNames(dir: string, badFileName: string) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await fixIncorrectNames(fullPath, badFileName);
    } 
    else if (entry.name === "index-logic.ts") {
      const content = await readFile(fullPath, "utf-8");
      
      // 1. Improved Regex: Now includes 'class' 
      // Also handles spacing/newlines between 'export' and the name
      const exportMatch = content.match(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/);
      
      if (exportMatch && exportMatch[1]) {
        const entityName = exportMatch[1];
        const newPath = join(dir, `${entityName}.ts`);

        try {
          await rename(fullPath, newPath);
          console.log(`✅ Fixed: ${entry.name} -> ${entityName}.ts`);
        } catch (err: any) {
          console.error(`❌ Could not rename ${fullPath}: ${err.message}`);
        }
      } else {
        console.log(`⚠️ Skipped: Could not find a named export in ${fullPath}`);
      }
    }
  }
}

const srcPath = resolve(process.cwd(), "src");
const badFileName = "index-logic.ts"
console.log(`🔍 Searching for ${badFileName} files...`);

if (!badFileName) {
  throw new Error('missing file name');
}
fixIncorrectNames(srcPath, badFileName)
  .then(() => console.log("✨ Done! Files renamed."))
  .catch(console.error);
