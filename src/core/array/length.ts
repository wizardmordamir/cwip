/**
 * Safely returns the length of an array, string, Set, or Map.
 * Returns 0 for null, undefined, or unsupported types.
 */
export const length = (value: unknown): number => {
  if (Array.isArray(value) || typeof value === 'string') {
    return value.length;
  }

  if (value instanceof Set || value instanceof Map) {
    return value.size;
  }

  return 0;
};
