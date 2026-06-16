import fs from 'node:fs'
import path from 'node:path';

const TARGET_IMPORT = "import {describe, expect, it} from 'bun:test';";
const SEARCH_STRING = 'bun:test';

/**
 * Recursively walks through directories to find and update test files.
 * @param {string} dir 
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Ignore node_modules to save time and prevent accidental edits
      if (file !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (file.includes('.spec.') || file.includes('.test.')) {
      updateFile(fullPath);
    }
  }
}

function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if the file already references bun:test anywhere
    if (!content.includes(SEARCH_STRING)) {
      console.log(`Updating: ${filePath}`);

      // Prepend the import to the top of the file
      const updatedContent = `${TARGET_IMPORT}\n${content}`;
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    } else {
      // Optional: Log files that are already compliant
      // console.log(`Skipping (Already has bun:test): ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
}

// Start from the current directory
const startPath = "./src"
console.log(`Starting scan in: ${startPath}\n`);
processDirectory(startPath);
console.log('\nDone!');