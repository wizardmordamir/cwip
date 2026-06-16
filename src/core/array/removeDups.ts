import { safeStringify } from '../object/safeStringify';

/**
 * Removes duplicate elements from an array.
 * Uses safeStringify to determine uniqueness for complex objects.
 */
export const removeDups = <T>(arr: T[]): T[] => {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= 1) return [...arr];

  const seen = new Set<string>();

  return arr.filter((item) => {
    const hash = safeStringify(item);
    if (seen.has(hash)) {
      return false;
    }
    seen.add(hash);
    return true;
  });
};
