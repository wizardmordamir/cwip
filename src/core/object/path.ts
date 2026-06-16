import { curry } from '../flow';

export type Path<T> =
  T extends ReadonlyArray<infer V>
    ? `${number}` | `${number}.${Path<V>}`
    : T extends object
      ? {
          [K in keyof T]: K extends string | number
            ? T[K] extends object
              ? `${K}` | `${K}.${Path<T[K]>}`
              : `${K}`
            : never;
        }[keyof T]
      : never;

export type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : Key extends `${number}` // Handle array/numeric index
      ? T extends ReadonlyArray<infer V>
        ? PathValue<V, Rest>
        : undefined
      : undefined
  : P extends keyof T
    ? T[P]
    : P extends `${number}`
      ? T extends ReadonlyArray<infer V>
        ? V
        : undefined
      : undefined;

/**
 * Public type of `path`. The first overload matches valid literal dot-paths,
 * giving editor autocomplete on the path string and the *exact* value type at
 * that path (via Path<T>/PathValue<T,P>). The second is a graceful fallback so a
 * dynamic (non-literal) path string still works, typed `any`. The third is the
 * data-last curried form, which defers the object type to the returned function.
 *
 * A plain `Curried<...>` wrapper can't express this — `Parameters`/`ReturnType`
 * of a generic strip its type params, collapsing `path` to `(string, obj) => any`.
 */
export type PathFn = {
  <T extends object, P extends Path<T>>(pathStr: P, obj: T): PathValue<T, P>;
  <T extends object>(pathStr: string, obj: T): any;
  <P extends string>(pathStr: P): <T extends object>(obj: T) => P extends Path<T> ? PathValue<T, P> : any;
};

export const path = curry(((pathStr: string, obj: object) => {
  if (obj === null || obj === undefined || !pathStr) return undefined;

  // Optimized split/lookup
  const keys = pathStr.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result == null) return undefined;
    // Security check
    if (key === '__proto__' || key === 'constructor') return undefined;
    result = result[key];
  }

  return result;
}) as any) as unknown as PathFn;
