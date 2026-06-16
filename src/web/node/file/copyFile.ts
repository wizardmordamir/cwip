import fs from 'node:fs';

/**
 * A monadic wrapper for copying files.
 * Instead of throwing, it returns a StateMonad that tracks success or failure.
 */
export const copyFileTask =
  (dest: string) =>
  async (src: string): Promise<string> => {
    // If the source doesn't exist, this will naturally throw,
    // which your StateMonad.bind() will catch and turn into a 'stopProcessing' state.
    if (!fs.existsSync(src)) {
      throw new Error(`Source file does not exist: ${src}`);
    }

    fs.copyFileSync(src, dest);

    // Return the destination path so the "snowball" context knows where the file went
    return dest;
  };
