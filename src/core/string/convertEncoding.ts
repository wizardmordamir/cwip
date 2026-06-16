import { type Curried, curry } from '../flow';

/**
 * Validates if a string is a valid Base64 encoded string.
 * Uses a Regex to check character set and padding before verifying length.
 */
export const isBase64 = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;

  // Regex:
  // 1. Checks for valid Base64 characters (A-Z, a-z, 0-9, +, /)
  // 2. Validates optional padding (=) at the end
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  if (!base64Regex.test(input)) return false;

  try {
    // Add trim() to handle trailing newlines often found in encoded files
    const trimmed = input.trim();
    return Buffer.from(trimmed, 'base64').toString('base64') === trimmed;
  } catch {
    return false;
  }
};

/**
 * Curried encoding converter.
 * Usage: convertEncoding('utf-8', 'hex')(str)
 */
export const convertEncoding = curry((from: BufferEncoding, to: BufferEncoding, input: string | Buffer): string => {
  if (input == null) return '';
  return Buffer.from(input as any, from).toString(to);
}, 3) as Curried<[BufferEncoding, BufferEncoding, string | Buffer], string>;

/**
 * Isomorphic toBase64 that handles UTF-8 safely
 */
export const toBase64 = (input: string): string => {
  if (typeof Buffer !== 'undefined') {
    // Node.js path
    return Buffer.from(input, 'utf-8').toString('base64');
  } else {
    // Browser path: Use TextEncoder for UTF-8 safety
    const bytes = new TextEncoder().encode(input);
    const binary = String.fromCodePoint(...bytes);
    return btoa(binary);
  }
};

/**
 * Isomorphic fromBase64
 */
export const fromBase64 = (base64: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } else {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
    return new TextDecoder().decode(bytes);
  }
};
