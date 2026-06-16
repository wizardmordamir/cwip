import { curry } from '../flow';
import { type Path, type PathValue, path } from '../object';

/**
 * pluck: (key) => (arr) => values[]
 *
 * First overload: a valid literal path into the element type gives autocomplete
 * on the key and the exact value-array type. Then a `string` fallback (dynamic
 * keys) and the data-last curried form.
 */
export const pluck = curry(((key: string, arr: any[]): any[] => {
  if (!Array.isArray(arr)) {
    return [];
  }

  // 1. Path first, Object second
  // 2. Pre-curry the getter for better performance across the map
  const getter = path(key as any);

  return arr.map((item) => getter(item));
}) as any) as unknown as {
  <T extends object, P extends Path<T>>(key: P, arr: T[]): PathValue<T, P>[];
  // fallback: dynamic key and/or arrays that may contain non-objects
  (key: string, arr: readonly unknown[]): any[];
  // data-last curried form
  <P extends string>(key: P): <T>(arr: T[]) => any[];
};
