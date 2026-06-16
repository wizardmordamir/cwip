import { rename } from 'node:fs/promises';
import { joinPath } from '../../../src/node';

/**
 * Moves a file from a source path to a destination path.
 * @param source - The current path of the file
 * @param destination - The path where the file should be moved
 */
async function moveFile(source: string, destination: string): Promise<void> {
  try {
    await rename(source, destination);
    console.log(`Successfully moved: ${source} ➡️ ${destination}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error moving file: ${error.message}`);
    } else {
      console.error('An unknown error occurred during the move.');
    }
  }
}

// --- Example Usage ---

// const makePath = joinPath(__dirname)

const fileName = 'assign.spec.ts'
const oldPath = `./src/utils/${fileName}`;
const newPath = `./src/object/${fileName}`;

moveFile(oldPath, newPath);