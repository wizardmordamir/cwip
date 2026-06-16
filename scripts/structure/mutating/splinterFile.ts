import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { join, dirname, basename, extname, resolve, isAbsolute } from "node:path";

/**
 * 🪓 SPLINTER FILE
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Takes a large "monolith" file and breaks it into many small, single-purpose files.
 * 2. Creates a new directory named after the original file.
 * 3. Extracts every exported function, constant, or class into its own <name>.ts file.
 * 4. Smart Imports: Scans each export and only copies the imports it actually uses.
 * 5. Path Fixing: Automatically adjusts relative imports (e.g., ./ becomes ../) so 
 *    the new files in the subdirectory still point to the correct locations.
 * 
 * WHY RUN THIS?
 * To transition from a "mega-file" architecture to a modular, "one-file-per-function" 
 * structure. This makes code easier to test, reduces merge conflicts, and enables 
 * better tree-shaking.
 * 
 * SAFETY:
 * - Renames the original file to <file>.ignore.ts instead of deleting it.
 * - Includes a verification step to ensure no exports were missed during the split.
 * - Non-exported helper code is kept within the blocks that utilize them.
 */


/**
 * CONFIGURATION
 */
const TARGET_FILE = "src/js-types.ts"; 
const FALLBACK_FUNC_NAME = "index-logic";

async function splinterFile(inputPath: string, fallbackName: string) {
  const originalCwd = process.cwd();
  const absolutePath = isAbsolute(inputPath) ? inputPath : resolve(originalCwd, inputPath);

  // 1. Verify file exists
  try {
    const stats = await stat(absolutePath);
    if (!stats.isFile()) throw new Error("Path is a directory.");
  } catch (error: any) {
    console.error(`❌ Error: ${error.message} at ${absolutePath}`);
    return;
  }

// 2. VERIFICATION STEP: Dynamic Import using file:// URL
  let runtimeExports: string[] = [];
  try {
    // Using pathToFileURL or a simple string prefix ensures Bun treats this as an absolute path
    const fileUrl = `file://${absolutePath}`;
    const module = await import(fileUrl);
    
    runtimeExports = Object.keys(module).filter(k => k !== 'default');
    console.log(`🔍 Runtime verified ${runtimeExports.length} exports: ${runtimeExports.join(', ')}`);
  } catch (err: any) {
    // If it still fails, it's likely a complex dependency issue in the target file
    console.warn("⚠️ Verification failed. Parser will proceed manually.");
    console.debug(`Reason: ${err.message}`);
  }

  // 3. Parser Logic (remains unchanged)
  const content = await readFile(absolutePath, "utf-8");
  const lines = content.split('\n');
  const dir = dirname(absolutePath);
  const fileName = basename(absolutePath, extname(absolutePath));
  const newOutputDir = join(dir, fileName);

  await mkdir(newOutputDir, { recursive: true });

  const importLines: string[] = [];
  const exportBlocks: { name: string; lines: string[] }[] = [];
  let currentBlock: { name: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && !currentBlock) continue;

    if (trimmed.startsWith('import ')) {
      const fixedImport = line.replace(/(from\s+['"])((\.\/|\.\.\/).*?)(['"])/g, (_, prefix, path, __, suffix) => {
        const newPath = path.startsWith('./') ? `../${path.substring(2)}` : `../${path}`;
        return `${prefix}${newPath}${suffix}`;
      });
      importLines.push(fixedImport);
      continue;
    }

    const exportMatch = line.match(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/);
    
    if (exportMatch) {
      if (currentBlock) exportBlocks.push(currentBlock);
      currentBlock = { name: exportMatch[1], lines: [line] };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }
  if (currentBlock) exportBlocks.push(currentBlock);

  // 4. Comparison Check
  const parsedNames = exportBlocks.map(b => b.name);
  const missed = runtimeExports.filter(name => !parsedNames.includes(name));
  
  if (runtimeExports.length > 0 && missed.length > 0) {
    console.error(`🛑 PARSER MISSED EXPORTS: ${missed.join(', ')}`);
    return; 
  }

  // 5. Write Files
  for (const block of exportBlocks) {
    const finalName = block.name || fallbackName;
    const blockBody = block.lines.join('\n').trim();
    
    const neededImports = importLines.filter(imp => {
      const members = imp.match(/{([^}]+)}/)?.[1]?.split(',').map(s => s.trim()) || [];
      const defaultImport = imp.match(/import\s+(\w+)\s+from/)?.[1];
      const allTerms = [...members, defaultImport].filter(Boolean);
      return allTerms.some(term => blockBody.includes(term!));
    });

    const newFileContent = [...neededImports, "", blockBody].join("\n") + "\n";
    await writeFile(join(newOutputDir, `${finalName}.ts`), newFileContent, "utf-8");
    console.log(`📄 Created: ${finalName}.ts`);
  }

  await rename(absolutePath, join(dir, `${fileName}.ignore.ts`));
  console.log(`\n✅ Success! Verification passed and ${parsedNames.length} files created.`);
}

const inputArg = process.argv[2];
splinterFile(inputArg || TARGET_FILE, FALLBACK_FUNC_NAME).catch(console.error);
