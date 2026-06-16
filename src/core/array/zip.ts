/**
 * Creates an array of grouped elements, the first of which contains the
 * first elements of the given arrays, the second of which contains
 * the second elements, and so on.
 */
export function zip<T1, T2>(a: T1[], b: T2[]): [T1, T2][];
export function zip<T>(...arrays: T[][]): T[][];
export function zip(...arrays: any[][]): any[][] {
  if (arrays.length === 0) return [];

  // Truncate to the shortest array
  const minLength = Math.min(...arrays.map((a) => (Array.isArray(a) ? a.length : 0)));

  if (minLength === 0 || !Number.isFinite(minLength)) return [];

  // Use Array.from for better performance and to avoid spread overhead
  return Array.from({ length: minLength }, (_, i) => arrays.map((array) => array[i]));
}
