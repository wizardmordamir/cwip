/**
 * Data-last single-key accessor: `prop(key)` returns a getter `(obj) => obj[key]`.
 * The point-free building block the toolbox's FP direction favors — drops straight
 * into `map`/`pipe` without a wrapper lambda. For nested access use `path`.
 *
 *   users.map(prop('name'))              // string[]
 *   pipe(prop('profile'), prop('email')) // obj => email
 */
export const prop =
  <K extends PropertyKey>(key: K) =>
  <T extends Record<K, unknown>>(obj: T): T[K] =>
    obj[key];
