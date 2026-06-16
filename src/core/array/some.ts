import { curry } from '../flow/curry';

/**
 * Tests whether at least one element in the array passes the test
 * implemented by the provided function.
 */
export const some = curry(<A>(fn: (v: A, index: number, array: A[]) => boolean, array: A[]): boolean => {
  if (!Array.isArray(array)) {
    return false;
  }

  return array.some(fn);
}) as unknown as {
  <A>(fn: (v: A, index: number, array: A[]) => boolean, array: A[]): boolean;
  <A>(fn: (v: A, index: number, array: A[]) => boolean): (array: A[]) => boolean;
};
