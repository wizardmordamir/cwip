import { curry } from '../flow/curry';
import { isEmpty } from '../is/isEmpty';

/**
 * Walk an array path (tuple) through T and return the value type at the end.
 * Supports object keys and numeric-string indexes into arrays. A key that isn't
 * present resolves to `undefined` (matching the runtime). An empty path returns T.
 *
 * Unlike the dot-string `Path<T>` used by `path`, this never enumerates every
 * path in the object — it only walks the specific tuple you pass, so it's cheap
 * regardless of how large/deep the object is.
 */
export type PathValueFromTuple<T, P extends readonly PropertyKey[]> = P extends readonly [infer Head, ...infer Rest]
  ? Rest extends readonly PropertyKey[]
    ? Head extends keyof T
      ? PathValueFromTuple<T[Head], Rest>
      : Head extends `${number}`
        ? T extends ReadonlyArray<infer V>
          ? PathValueFromTuple<V, Rest>
          : undefined
        : undefined
    : never
  : T;

// 1. Internal implementation with type safety
const fn = (path: string[], obj: any): any => {
  if (isEmpty(path)) return obj;

  const [property, ...rest] = path;

  // Use Object.hasOwn for safety against prototype pollution
  return obj && Object.hasOwn(obj, property) ? fn(rest, obj[property]) : undefined;
};

/**
 * Public type of `getValue`. The typed overloads use a `const` tuple so a literal
 * path like `['a', 'b']` is captured exactly and the value type is computed via
 * PathValueFromTuple. They're constrained to a NON-EMPTY tuple so a dynamic
 * `string[]` (or `[]`) falls through to the `any` fallback instead of mistyping.
 */
export type GetValueFn = {
  // typed: literal tuple path -> exact value type
  <T, const P extends readonly [PropertyKey, ...PropertyKey[]]>(path: P, obj: T): PathValueFromTuple<T, P>;
  // dynamic fallback: non-literal / empty array path
  (path: readonly PropertyKey[], obj: object): any;
  // typed curried form (object deferred)
  <const P extends readonly [PropertyKey, ...PropertyKey[]]>(path: P): <T>(obj: T) => PathValueFromTuple<T, P>;
  // dynamic curried fallback
  (path: readonly PropertyKey[]): (obj: object) => any;
};

// 2. Export with the explicit generic type (a plain Curried<…> wrapper would
//    collapse this to `(string[], object) => any`).
export const getValue = curry(fn, 2) as unknown as GetValueFn;
