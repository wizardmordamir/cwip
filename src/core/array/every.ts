import { curry } from '../flow';

/**
 * Returns true if every element in the array satisfies the predicate.
 */
export function every<T, S extends T>(
  predicate: (value: T, index: number, array: T[]) => value is S,
  array: T[],
): array is S[];
export function every<T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): boolean;
export function every(predicate: any, array: any) {
  // Defensive check for production environments
  if (!Array.isArray(array)) return false;
  return array.every(predicate);
}

export const everyCurried = curry(every) as unknown as {
  <T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): boolean;
  <T>(predicate: (value: T, index: number, array: T[]) => boolean): (array: T[]) => boolean;
};
