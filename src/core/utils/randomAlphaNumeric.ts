import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure alphanumeric string.
 */
export const randomAlphaNumeric = (length: number): string => {
  if (length <= 0) return '';

  const options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const optionsLength = options.length;
  let result = '';

  // Use crypto for production-grade randomness
  const bytes = randomBytes(length);

  for (let i = 0; i < length; i++) {
    // Modular arithmetic to map byte values to options index
    result += options.charAt(bytes[i] % optionsLength);
  }

  return result;
};
