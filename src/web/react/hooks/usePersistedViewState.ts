import { useCallback, useSyncExternalStore } from 'react';

/**
 * A reactive key→value store backing {@link usePersistedViewState}. Apps supply
 * an adapter so the same hook works against any persistence layer: a Redux+server
 * preferences slice (cursedalchemy), plain localStorage (rubato — see
 * {@link createLocalStorageViewStore}), or anything else.
 *
 * `get` must return a **referentially stable** value for an unchanged key (so
 * `useSyncExternalStore` doesn't loop) — return cached objects, not fresh parses.
 */
export interface ViewStateStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe(listener: () => void): () => void;
}

/**
 * `useState`-shaped hook whose value is remembered across reloads via the given
 * {@link ViewStateStore}. Use it for per-page UI choices — a selected tab, time
 * range, view mode, sort — so a page reappears as the user left it. Keys should
 * be stable and namespaced per page, e.g. `'calendar.view'`.
 *
 * Bind the store once in your app and re-export a thin wrapper:
 *   export const useView = <T>(k: string, f: T) => usePersistedViewState(viewStore, k, f);
 */
export function usePersistedViewState<T>(store: ViewStateStore, key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    store.subscribe,
    () => {
      const stored = store.get<T>(key);
      return stored === undefined ? fallback : stored;
    },
    () => fallback,
  );
  const setValue = useCallback((next: T) => store.set(key, next), [store, key]);
  return [value, setValue];
}
