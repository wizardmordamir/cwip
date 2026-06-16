import { curry } from '../flow/curry';

/**
 * map: (fn, arr) -> newArr
 *
 * The explicit dual-overload type is required because `curry()` cannot preserve
 * the inner generic (TS would otherwise monomorphize `<T, R>` to `unknown`).
 */
export const map = curry(<T, R>(fn: (value: T) => R, arr: T[]): R[] => {
  return arr.map(fn);
}) as unknown as {
  <T, R>(fn: (value: T) => R, arr: T[]): R[];
  <T, R>(fn: (value: T) => R): (arr: T[]) => R[];
};
