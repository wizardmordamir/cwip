/**
 * Deep clone via a JSON round-trip. Deliberately distinct from `deepClone`
 * (structuredClone): the JSON trip is *lossy but tolerant* — functions,
 * `undefined` values, and symbols are silently dropped, Dates become ISO
 * strings, and getter-backed objects (e.g. Immer/store proxy drafts, which
 * `structuredClone` rejects with `DataCloneError`) are snapshotted through
 * their getters. Reach for this when cloning state drafts or stripping a value
 * down to its serializable shape; reach for `deepClone` when fidelity matters.
 */
export const jsonClone = <T>(value: T): T => {
  if (!value) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};
