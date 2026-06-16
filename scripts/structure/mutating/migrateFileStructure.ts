import { mkdir, rename } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { readFile } from "../../../src";

/**
 * 🏗️ MIGRATE FILE STRUCTURE
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Reads a 'structure.json' map and reshuffles the entire repo into a new 
 *    category-based architecture (e.g., /arrays -> /array, /monads -> /fp).
 * 2. Logic Flattening: Automatically converts "folder-per-function" patterns 
 *    back to single files (e.g., arrays/tail/index.ts -> array/tail.ts).
 * 3. Test Standardization: Renames .spec.ts files to .test.ts for better 
 *    compatibility with the Bun test runner.
 * 4. Path Mapping: Uses a CATEGORY_MAP to translate old, deep directory 
 *    paths into a flatter, more logical library structure.
 * 
 * WHY RUN THIS?
 * Use this when you are performing a major "Library Reorganization." It 
 * automates the tedious work of moving hundreds of files and ensures that 
 * your new categories (array, logic, fp, types) are populated consistently.
 * 
 * SAFETY:
 * - DRY_RUN Mode: Defaults to 'true', logging all planned moves to the 
 *   console without touching the disk.
 * - mkdir -p: Automatically creates any new category directories as needed.
 * - Validation: Skips operations where the file is already in the correct place.
 */


// Configuration
const SRC_DIR = "./src";
const DRY_RUN = true; // Set to false to execute changes
const structure: Record<string, any> = await readFile("./structure.json").then(JSON.parse);

/**
 * Maps the original deep paths to new library categories.
 */
const CATEGORY_MAP: Record<string, string> = {
  "arrays": "array",
  "functional/array-helpers": "array",
  "objects": "object",
  "functional/util-functions": "logic",
  "pipes": "logic",
  "monads": "fp",
  "functional/monads": "fp",
  "functional/interfaces": "fp/interfaces",
  "functional/typescriptUtils": "types",
  "ts-types": "types",
  "helpers": "common",
  "utils/fileUtils": "fs",
  "testing": "testing",
};

interface MoveOp {
  from: string;
  to: string;
}

const moves: MoveOp[] = [];

function parseStructure(obj: any, currentPath: string = "src") {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = join(currentPath, key);

    if (value === "file") {
      processFile(fullPath);
    } else {
      parseStructure(value, fullPath);
    }
  }
}

function processFile(filePath: string) {
  const parts = filePath.split('/');
  // Remove 'src' from the start for mapping
  const relativePath = parts.slice(1).join('/');

  // Find the matching category
  const match = Object.keys(CATEGORY_MAP).find(root => relativePath.startsWith(root));
  if (!match) return;

  const category = CATEGORY_MAP[match];
  const fileName = basename(filePath);
  const parentFolder = parts[parts.length - 2];

  let newName = fileName;

  // Logic: Flatten folder-per-util (e.g., arrays/tail/index.ts -> array/tail.ts)
  if (fileName === "index.ts" && parentFolder !== match.split('/').pop()) {
    newName = `${parentFolder}.ts`;
  }
  // Standardize tests to .test.ts for Bun compatibility
  else if (fileName.endsWith(".spec.ts")) {
    newName = fileName.replace(".spec.ts", ".test.ts");
  }

  const destination = join("src", category, newName);

  // Avoid moving a file to its current location
  if (filePath !== destination) {
    moves.push({ from: filePath, to: destination });
  }
}

async function execute() {
  parseStructure(structure.src);

  console.log(DRY_RUN ? "--- DRY RUN: MAPPING MOVES ---" : "--- EXECUTING MIGRATION ---");

  for (const move of moves) {
    console.log(`${move.from}  ->  ${move.to}`);
    if (!DRY_RUN) {
      await mkdir(dirname(move.to), { recursive: true });
      try {
        await rename(move.from, move.to);
      } catch (e) {
        console.error(`Error moving ${move.from}:`, e.message);
      }
    }
  }

  if (DRY_RUN) {
    console.log(`\nTotal operations mapped: ${moves.length}`);
    console.log("Set DRY_RUN = false to apply changes.");
  }
}

execute();
