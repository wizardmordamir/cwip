/**
 * Flattens an array to a specified depth.
 * @param depth - The depth level specifying how deep a nested array structure
 * should be flattened. Defaults to 1.
 */
export const flat =
  (depth: number = 1) =>
  <T>(array: T[]): FlatArray<T[], number>[] => {
    if (!Array.isArray(array)) {
      return [];
    }
    return array.flat(depth) as FlatArray<T[], number>[];
  };
