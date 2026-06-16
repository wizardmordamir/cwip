import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Swaps the first two and last two characters of a base64 body, leaving any
 * trailing `=` padding in place. This is its own inverse: applying it twice
 * returns the original string, so the same helper serves both directions.
 */
const swapEnds = (str: string): string => {
  if (str.length < 4) return str;

  const paddingStart = str.search(/=+$/);
  const hasPadding = paddingStart !== -1;
  const contentEnd = hasPadding ? paddingStart : str.length;
  if (contentEnd < 4) return str;

  const firstTwo = str.slice(0, 2);
  const lastTwo = str.slice(contentEnd - 2, contentEnd);
  const middle = str.slice(2, contentEnd - 2);
  const padding = hasPadding ? str.slice(paddingStart) : '';

  return lastTwo + middle + firstTwo + padding;
};

const reverse = (str: string): string => str.split('').reverse().join('');

/**
 * Compresses a string (gzip), base64-encodes it, then lightly scrambles the
 * result (swap the ends, reverse the whole thing) so the output doesn't look
 * like ordinary base64. `deobfuscate` reverses every step exactly.
 *
 * This is obfuscation + compaction, NOT encryption — the transform is fully
 * reversible by anyone with this code and provides no secrecy. Use it to make
 * bundled text compact and non-obvious, not to protect secrets.
 */
export const obfuscate = async (input: string): Promise<string> => {
  const compressed = await gzipAsync(Buffer.from(input, 'utf-8'));
  return reverse(swapEnds(compressed.toString('base64')));
};

/** Inverts `obfuscate`, recovering the original UTF-8 string. */
export const deobfuscate = async (encoded: string): Promise<string> => {
  const unscrambled = swapEnds(reverse(encoded));
  const decompressed = await gunzipAsync(Buffer.from(unscrambled, 'base64'));
  return decompressed.toString('utf-8');
};
