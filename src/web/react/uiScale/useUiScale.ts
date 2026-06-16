import { useSyncExternalStore } from 'react';
import {
  DEFAULT_UI_SCALE,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  nearestUiScaleLevel,
  UI_SCALE_LEVELS,
  type UiScaleLevel,
  type UiScaleLevelId,
} from './scale';
import { getUiScale, setUiScale, subscribeUiScale, uiScaleStore } from './uiScaleStore';

export interface UseUiScale {
  /** Current scale multiplier (1 = default). */
  scale: number;
  /** The preset closest to `scale` (for an active picker state). */
  level: UiScaleLevel;
  /** The available presets. */
  levels: readonly UiScaleLevel[];
  setScale: (scale: number) => void;
  setLevel: (id: UiScaleLevelId) => void;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
  /** True at the smallest/largest supported size (disable the stepper). */
  atMin: boolean;
  atMax: boolean;
}

/**
 * Read + control the app-wide UI size. Backed by the shared {@link uiScaleStore}
 * (persisted to localStorage, applied to the document root), so every consumer —
 * the control in Settings and anything else — stays in sync. SSR-safe: renders the
 * default size on the server, hydrates the saved one on the client.
 *
 * Pair with `initUiScale()` at app start so the saved size applies with no flash,
 * and drop a `<UiScaleControl />` wherever you keep accessibility settings.
 */
export function useUiScale(): UseUiScale {
  const scale = useSyncExternalStore(subscribeUiScale, getUiScale, () => DEFAULT_UI_SCALE);
  return {
    scale,
    level: nearestUiScaleLevel(scale),
    levels: UI_SCALE_LEVELS,
    setScale: setUiScale,
    setLevel: (id) => setUiScale((UI_SCALE_LEVELS.find((l) => l.id === id) ?? UI_SCALE_LEVELS[1]).scale),
    increase: () => uiScaleStore.step(1),
    decrease: () => uiScaleStore.step(-1),
    reset: () => uiScaleStore.reset(),
    atMin: scale <= MIN_UI_SCALE,
    atMax: scale >= MAX_UI_SCALE,
  };
}
