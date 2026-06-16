import { path } from '../object';

/**
 * extractKey: (key, fn) => (v) => value
 * Transforms v via fn, then extracts a deep key from the result.
 */
export const extractKey = (key: string, fn: any) => (v: any) => {
  const result = fn(v);

  // Cast key to 'any' to stop the Path<T> check from collapsing to 'never'
  // and ensure you are passing (path, object)
  return path(key as any, result);
};
