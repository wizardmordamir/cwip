# 🛠️ Directory & Structure Toolchain

Use these scripts in order when refactoring to keep the repository clean and exports synchronized.

### 1. The Splinter Phase
**Script:** `splinterFile.ts`
**When:** You have a large "monolith" file that needs to be broken into individual files.
**Reason:** It automates the extraction of functions, handles imports, and fixes paths for you.
**Run:** `bun scripts/structure/mutating/splinterFile.ts `

### 2. The Cleanup Phase
**Script:** `cleanEmptyAndIndexOnlyFolders.ts`
**When:** After moving/splintering files or deleting features.
**Reason:** It deletes "ghost" folders and ensures logic hidden in `index.ts` is renamed to match its function name.
**Run:**`bun scripts/structure/mutating/cleanEmptyAndIndexOnlyFolders.ts`

### 3. The Migration Phase (Optional)
**Script:** `migrateFileStructure.ts`
**When:** You are performing a major architectural reshuffle (e.g., moving `/arrays` to `/array`).
**Reason:** It bulk-moves files based on a category map and standardizes `.spec` to `.test`.
**Run:** `bun scripts/structure/mutating/migrateFileStructure.ts`

### 4. The Sync Phase
**Script:** `remakeIndexes.ts`
**When:** Every time you change the directory structure.
**Reason:** It is the "glue." It rebuilds all `index.ts` barrel files so your imports never break.
**Run:** `bun scripts/structure/mutating/remakeIndexes.ts`

### 5. The Audit Phase
**Script:** `validateFiles.ts`
**When:** Before you commit your changes.
**Reason:** The final safety check. It verifies that every file on disk is exported and every export in an index actually exists.

---

## Recommended Workflow
`Splinter` ➡️ `Cleanup` ➡️ `Sync` ➡️ `Audit`
