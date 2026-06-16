/**
 * UI scale — the pure model behind an app-wide "text/UI size" accessibility
 * control. A single number multiplies the document's root font-size, so every
 * **rem-based** Tailwind utility (text, spacing, gaps, rem-sized icons) grows or
 * shrinks together. Because the whole UI scales proportionally — like browser
 * zoom — relative spacing, alignment, and source order are preserved by
 * construction: there's no per-element override that could reflow things into an
 * overlap or reorder a label below its section. (Anything sized in raw px won't
 * scale; cwip's components are rem-first so they do.)
 *
 * This file is framework- and DOM-free so it's trivially testable; the React hook
 * + the store that actually touches `document`/`localStorage` build on it.
 */

export type UiScaleLevelId = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface UiScaleLevel {
  readonly id: UiScaleLevelId;
  readonly label: string;
  /** Root-font-size multiplier (1 = the browser/app default). */
  readonly scale: number;
}

/** Named presets for a simple picker. Continuous values in between are valid too. */
export const UI_SCALE_LEVELS: readonly UiScaleLevel[] = [
  { id: 'sm', label: 'Small', scale: 0.9 },
  { id: 'md', label: 'Default', scale: 1 },
  { id: 'lg', label: 'Large', scale: 1.15 },
  { id: 'xl', label: 'Larger', scale: 1.3 },
  { id: 'xxl', label: 'Largest', scale: 1.5 },
];

export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 2;
export const DEFAULT_UI_SCALE = 1;
/** One press of the +/- stepper. */
export const UI_SCALE_STEP = 0.1;

/** Clamp to the supported range, rounded to 3 decimals; non-finite → default. */
export function clampUiScale(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_UI_SCALE;
  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(n * 1000) / 1000));
}

/** Nudge a scale up (+1) or down (-1) by one step, clamped. */
export function stepUiScale(scale: number, dir: 1 | -1): number {
  return clampUiScale(scale + dir * UI_SCALE_STEP);
}

/** The preset closest to a (continuous) scale — drives a picker's active state. */
export function nearestUiScaleLevel(scale: number): UiScaleLevel {
  const s = clampUiScale(scale);
  return UI_SCALE_LEVELS.reduce((best, level) => (Math.abs(level.scale - s) < Math.abs(best.scale - s) ? level : best));
}

/** The CSS `font-size` value to set on the root, e.g. 1.15 → "115%". Percent (not
 *  px) so it composes with the user's own browser base-font preference. */
export function uiScaleToFontSize(scale: number): string {
  const pct = Math.round(clampUiScale(scale) * 1000) / 10; // 1.15 → 115, 0.9 → 90
  return `${pct}%`;
}
