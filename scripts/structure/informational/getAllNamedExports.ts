import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

/**
 * 🔍 VERIFY ALL FUNCTIONS EXPORTED
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Scans every .ts file in 'src' to find all named exports (functions, consts, classes).
 * 2. Compiles a giant list of every single unique export in your codebase.
 * 3. Generates 'scripts/reports/allFunctionsExported.ts' at the root.
 * 4. Attempts to import every found name from './src/index'.
 * 
 * WHY RUN THIS?
 * To find "Dead Exports." If this generated file has TypeScript errors, it means 
 * those functions are defined in a file but NOT exported via your barrel/index 
 * system. They are effectively invisible to the rest of your app.
 */

const ignorePatterns = ['.ignore.', '.spec.', '.test.', 'index.ts'];

async function getAllNamedExports(dir: string, allExports: Set<string>) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await getAllNamedExports(fullPath, allExports);
      }
    } else if (
      extname(entry.name) === '.ts' &&
      !ignorePatterns.some((pattern) => entry.name.includes(pattern))
    ) {
      const content = await readFile(fullPath, "utf-8");
      // Match export function, const, let, var, class
      const matches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/g);
      for (const match of matches) {
        allExports.add(match[1]);
      }
    }
  }
}

async function run() {
  const srcDir = resolve(process.cwd(), "src");
  const outputFile = resolve(process.cwd(), "scripts/reports/allFunctionsExported.ts");
  const exportSet = new Set<string>();

  console.log("📂 Scanning for all named exports...");
  await getAllNamedExports(srcDir, exportSet);

  const sortedExports = Array.from(exportSet).sort((a, b) => {
    const lowA = a.toLowerCase();
    const lowB = b.toLowerCase();
    if (lowA < lowB) return -1;
    if (lowA > lowB) return 1;
    return a < b ? 1 : -1; // Biome-style tie-breaker
  });

  const importStatement = `import {\n  ${sortedExports.join(",\n  ")}\n} from '../../src';\n\n// This file exists to verify that all internal functions are reachable via the root index.\n// If any of the imports above are red, they are missing from your barrel/index tree.\n`;

  await writeFile(outputFile, importStatement, "utf-8");

  console.log(`✅ Generated: ${outputFile}`);
  console.log(`📊 Total unique exports found: ${sortedExports.length}`);
  console.log("\n💡 Open this file in your editor. Red squiggles = Orphans/Missing Exports.");
}

run().catch(console.error);
