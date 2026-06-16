import { createHash } from 'node:crypto';

/**
 * Generates a consistent hash-based ID from any data structure.
 * The same input will always produce the same output.
 * @param data - Any data to generate an ID from (object, string, number, etc.)
 * @param length - Desired length of the output ID (default: 12)
 * @returns A consistent, URL-safe ID string
 */
export const makeIdFromData = ({ data, length = 40 }: { data: any; length?: number }): string => {
  // Convert data to a consistent string representation
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);

  // Create a hash of the data
  const hash = createHash('sha256').update(dataString).digest('base64');

  // Convert to URL-safe string and trim to desired length
  return hash
    .replace(/[+/=]/g, '') // Remove URL-unsafe characters
    .slice(0, length) // Trim to desired length
    .toLowerCase(); // Convert to lowercase for consistency
};
