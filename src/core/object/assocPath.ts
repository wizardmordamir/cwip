import { curry } from '../flow';
import type { Path, PathValue } from './path';

/**
 * Sets a value at a given path in an object, creating nested objects as needed.
 * @param path - The dot-separated path string
 * @param value - The value to set
 * @param obj - The object to modify
 * @returns A new object with the value set at the path
 */
const assocPathImpl = <T extends object>(path: string, value: any, obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  if (!path) return obj;

  const keys = path.split('.');
  const result = { ...obj };
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result;
};

/**
 * Public type of `assocPath`. The first overload matches a valid literal path
 * into the object: it gives autocomplete on the path and contextually types the
 * `value` to whatever lives at that path. The `string` overload is the fallback
 * for dynamic paths and for *creating* new paths (assocPath's documented
 * behavior), where the value is necessarily loose. The remaining overloads keep
 * the curried forms working. Every form returns the same object shape `T`.
 */
export type AssocPathFn = {
  // valid existing literal path: autocomplete + value typed to the path; clean T back
  <T extends object, P extends Path<T>>(path: P, value: PathValue<T, P>, obj: T): T;
  // fallback: dynamic path or *creating* a new (possibly nested) key. The added
  // key can't be expressed in T, so this stays `any` (the pre-existing behavior).
  (path: string, value: any, obj: object): any;
  // curried forms (loose)
  (path: string, value: any): (obj: object) => any;
  (
    path: string,
  ): {
    (value: any, obj: object): any;
    (value: any): (obj: object) => any;
  };
};

export const assocPath = curry(assocPathImpl) as unknown as AssocPathFn;
