/**
 * Data-last equality predicate: `propEq(key, value)` returns
 * `(obj) => obj[key] === value` (strict equality). The point-free way to write
 * the most common `filter`/`find` callback.
 *
 *   users.filter(propEq('role', 'admin'))
 *   orders.find(propEq('id', orderId))
 */
export const propEq =
  <K extends PropertyKey>(key: K, value: unknown) =>
  <T extends Record<K, unknown>>(obj: T): boolean =>
    obj[key] === value;
