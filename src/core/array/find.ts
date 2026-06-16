import { curry } from '../flow';

export function find<T, S extends T>(
  predicate: (value: T, index: number, array: T[]) => value is S,
  array: T[],
): S | undefined;
export function find<T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): T | undefined;
export function find(predicate: any, array: any) {
  if (!Array.isArray(array)) return undefined;
  return array.find(predicate);
}

export const findCurried = curry(find) as unknown as {
  <T, S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, array: T[]): S | undefined;
  <T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): T | undefined;
  <T>(predicate: (value: T, index: number, array: T[]) => boolean): (array: T[]) => T | undefined;
};
