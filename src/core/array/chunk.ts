/**
 * Splits an array into contiguous groups of (at most) `size` elements.
 * Curried, data-last: `chunk(2)([1, 2, 3]) => [[1, 2], [3]]`.
 *
 * A `size` of 0 or less yields an empty array (no sensible grouping exists).
 */
export const chunk =
  (size: number) =>
  <T>(array: T[]): T[][] => {
    if (!Array.isArray(array) || size < 1) {
      return [];
    }

    const out: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      out.push(array.slice(i, i + size));
    }
    return out;
  };
