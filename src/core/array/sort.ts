/**
 * Returns a new sorted array without mutating the original.
 * @param sortFn - Optional comparator function.
 * @param array - The array to sort.
 */
export const sort =
  <I>(sortFn?: (a: I, b: I) => number) =>
  (array: I[]): I[] => {
    if (!Array.isArray(array)) {
      return [];
    }

    // Use toSorted() for Node 20+/Bun, or [...array].sort() for compatibility
    // This prevents mutation of the input array.
    return [...array].sort(sortFn);
  };
