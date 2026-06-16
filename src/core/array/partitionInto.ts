import { chunk } from './chunk';

/**
 * Splits an array into at most `count` contiguous buckets of near-equal size —
 * the inverse framing of `chunk` (fixed bucket count vs. fixed bucket size).
 * Curried, data-last: `partitionInto(3)([1, 2, 3, 4, 5]) => [[1, 2], [3, 4], [5]]`.
 *
 * Fewer buckets than `count` are returned when there aren't enough elements to
 * fill them (e.g. 2 items into 5 buckets yields 2 buckets, not 5 with empties) —
 * which is exactly what you want when fanning work out to N workers without
 * spawning idle ones.
 */
export const partitionInto =
  (count: number) =>
  <T>(array: T[]): T[][] => {
    if (!Array.isArray(array) || count < 1 || array.length === 0) {
      return [];
    }

    const size = Math.ceil(array.length / count);
    return chunk(size)(array);
  };
