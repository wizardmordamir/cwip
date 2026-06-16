import type { ViewStateStore } from './usePersistedViewState';

/** The minimal `Storage` surface this store needs (so tests can inject a fake). */
export type ViewStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface LocalStorageViewStoreOptions {
  /** localStorage key holding the JSON blob of all views (default `'cwip.viewState'`). */
  storageKey?: string;
  /** Storage backend (default `globalThis.localStorage`). */
  storage?: ViewStorage | null;
}

/**
 * A {@link ViewStateStore} backed by a single JSON blob in localStorage. Holds
 * an in-memory cache so `get` returns referentially-stable values (required by
 * `useSyncExternalStore`) and writes notify subscribers synchronously. Safe to
 * construct where no storage exists (SSR/tests with `storage: null`) — it just
 * keeps the cache in memory.
 */
export const createLocalStorageViewStore = (options: LocalStorageViewStoreOptions = {}): ViewStateStore => {
  const storageKey = options.storageKey ?? 'cwip.viewState';
  const storage =
    options.storage === undefined ? (globalThis as { localStorage?: ViewStorage }).localStorage : options.storage;
  const listeners = new Set<() => void>();

  const read = (): Record<string, unknown> => {
    if (!storage) return {};
    try {
      return JSON.parse(storage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  let cache = read();

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify(cache));
    } catch {
      // Quota/private-mode failures are non-fatal; the in-memory cache still works.
    }
  };

  return {
    get: <T>(key: string) => cache[key] as T | undefined,
    set: <T>(key: string, value: T) => {
      cache = { ...cache, [key]: value };
      persist();
      for (const l of listeners) l();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
