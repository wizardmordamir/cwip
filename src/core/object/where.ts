/** A spec mapping (some) keys of `T` to a predicate over that key's value. */
export type WhereSpec<T> = { [K in keyof T]?: (value: T[K]) => boolean };

/**
 * Data-last record matcher: `where(spec)` returns a predicate that's true when an
 * object satisfies every predicate in `spec` (keys absent from the spec are
 * ignored). Composes the common "filter by several field conditions" case.
 *
 *   const active = where<User>({ age: (n) => n >= 18, status: (s) => s === 'active' });
 *   users.filter(active);
 */
export const where =
  <T>(spec: WhereSpec<T>) =>
  (obj: T): boolean =>
    (Object.keys(spec) as Array<keyof T>).every((key) => {
      const predicate = spec[key];
      return predicate ? predicate(obj[key]) : true;
    });
