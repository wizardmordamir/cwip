import { curry } from '../flow';

export function filter<T, S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, array: T[]): S[];
export function filter<T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): T[];
export function filter(predicate: any, array: any) {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
}

export const filterCurried = curry(filter) as unknown as {
  <T, S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, array: T[]): S[];
  <T>(predicate: (value: T, index: number, array: T[]) => boolean, array: T[]): T[];
  <T>(predicate: (value: T, index: number, array: T[]) => boolean): (array: T[]) => T[];
};
