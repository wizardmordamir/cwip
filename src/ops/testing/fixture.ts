export type Builder<T> = (overrides?: Partial<T>) => T;

/**
 * Build a fixture factory from defaults. Pass a plain object for static defaults,
 * or a factory function when each build needs fresh values (unique ids, dates):
 *
 *   const aUser = defineFixture(() => ({ id: seqId('user'), name: 'Test', roles: [] }));
 *   aUser();                       // fresh id
 *   aUser({ roles: ['admin'] });   // override just what you need
 *
 * Object defaults are deep-cloned per build so nested arrays/objects are never
 * shared between fixtures.
 */
export const defineFixture = <T extends object>(defaults: T | (() => T)): Builder<T> => {
  return (overrides?: Partial<T>): T => {
    const base = typeof defaults === 'function' ? (defaults as () => T)() : (structuredClone(defaults) as T);
    return { ...base, ...(overrides ?? {}) };
  };
};

/** A monotonic counter, handy for unique fixture values within one run. */
export const sequence = (start = 1): (() => number) => {
  let n = start - 1;
  return () => (n += 1);
};

// Per-prefix counters so ids are unique and readable within a process.
const counters = new Map<string, number>();

/**
 * A short, unique, human-readable id for a given prefix — `user-1`, `user-2`, …
 * Deterministic within a process (counter-based), so failure messages and
 * snapshots stay stable across runs unless the call order changes.
 */
export const seqId = (prefix = 'id'): string => {
  const n = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, n);
  return `${prefix}-${n}`;
};

/** Reset all seqId counters — call between independent suites if you need it. */
export const resetSeqIds = (): void => counters.clear();
