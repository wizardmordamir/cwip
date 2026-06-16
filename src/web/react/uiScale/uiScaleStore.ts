/**
 * The UI-scale store: holds the current scale, persists it, applies it to the
 * document root, and notifies subscribers. Split from the React hook so it works
 * before React mounts (call {@link initUiScale} early — like a theme init — to
 * apply the saved size with no flash) and so its logic is testable without a DOM.
 *
 * Side-effects (storage + applying to the page) are injected, so a test drives a
 * real store with fakes; the exported default singleton binds them to
 * `localStorage` + the `<html>` element.
 */

import { clampUiScale, DEFAULT_UI_SCALE, stepUiScale, uiScaleToFontSize } from './scale';

/** The slice of the Web Storage API the store needs (so a test can fake it). */
export interface UiScaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface UiScaleStore {
  /** Current scale (lazily hydrated from storage on first read). */
  get(): number;
  /** Set, clamp, persist, apply, and notify. */
  set(scale: number): void;
  /** Nudge up (+1) / down (-1) one step. */
  step(dir: 1 | -1): void;
  /** Back to the default size. */
  reset(): void;
  /** Re-apply the persisted scale to the page (call once on app boot). */
  init(): void;
  subscribe(listener: () => void): () => void;
}

export interface UiScaleStoreOptions {
  storage?: UiScaleStorage | null;
  /** Apply a scale to the page. Default writes the root font-size + a CSS var. */
  apply?: (scale: number) => void;
  /** localStorage key. */
  key?: string;
}

export const UI_SCALE_STORAGE_KEY = 'cwip.uiScale';

export function createUiScaleStore(options: UiScaleStoreOptions = {}): UiScaleStore {
  const { storage = null, apply, key = UI_SCALE_STORAGE_KEY } = options;
  const listeners = new Set<() => void>();
  let current: number | undefined; // undefined until first hydrate

  const hydrate = (): number => {
    if (current !== undefined) return current;
    const raw = storage?.getItem(key);
    current = raw != null ? clampUiScale(Number.parseFloat(raw)) : DEFAULT_UI_SCALE;
    return current;
  };

  const commit = (next: number): void => {
    const clamped = clampUiScale(next);
    current = clamped;
    storage?.setItem(key, String(clamped));
    apply?.(clamped);
    for (const l of listeners) l();
  };

  return {
    get: hydrate,
    set: commit,
    step: (dir) => commit(stepUiScale(hydrate(), dir)),
    reset: () => commit(DEFAULT_UI_SCALE),
    init: () => apply?.(hydrate()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Apply a scale to the document root: scale the rem base + expose a `--cwip-ui-scale`
 *  var (for the rare px that wants `calc(... * var(--cwip-ui-scale))`). SSR-safe. */
export function applyUiScaleToDocument(scale: number): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.fontSize = uiScaleToFontSize(scale);
  root.style.setProperty('--cwip-ui-scale', String(clampUiScale(scale)));
}

const defaultStorage: UiScaleStorage | null = typeof localStorage !== 'undefined' ? localStorage : null;

/** The app-wide singleton bound to localStorage + the page. */
export const uiScaleStore = createUiScaleStore({ storage: defaultStorage, apply: applyUiScaleToDocument });

export const getUiScale = (): number => uiScaleStore.get();
export const setUiScale = (scale: number): void => uiScaleStore.set(scale);
export const subscribeUiScale = (listener: () => void): (() => void) => uiScaleStore.subscribe(listener);
/** Apply the saved UI size on app boot, before React mounts (no flash). */
export const initUiScale = (): void => uiScaleStore.init();
