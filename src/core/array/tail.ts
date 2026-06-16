/**
 * Returns all elements of an array except the first.
 * Does not mutate the original array.
 */
export const tail = <T>(arr: T[]): T[] => {
  // Check for array-like objects or non-arrays
  if (!Array.isArray(arr)) {
    return [];
  }

  // Optimization: If empty or single element, return new empty array immediately
  if (arr.length <= 1) {
    return [];
  }

  return arr.slice(1);
};
