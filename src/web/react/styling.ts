import type { CSSProperties } from 'react';

/**
 * The cwip/react styling-override convention.
 *
 * Every styled component ships **Tailwind-first defaults** that work out of the
 * box (in a Tailwind v4 app that `@import "cwip/styles.css";` or `@source`s the
 * whole `cwip/dist`) and exposes a
 * uniform, highly-configurable override surface so any app can adapt or fully
 * replace those defaults — with Tailwind classes OR plain CSS.
 *
 * Each component renders one or more named **slots** (e.g. a Tooltip has `root`
 * and `bubble`). For every slot you can:
 *   - **do nothing** → the sensible default is used;
 *   - **merge** → pass a string class / a style object, appended to the default;
 *   - **fully replace** → pass a *function* `(default) => next`, so you decide
 *     whether to extend or ignore the default entirely (`() => 'mine'` replaces);
 *   - **drop the visual defaults** → `unstyled` (the component still positions
 *     itself — see {@link Unstyled});
 *   - **drop everything incl. layout** → `unstyled: 'all'` for a true blank slate.
 *
 * Components keep two layers of default styling apart: **visual** defaults live in
 * Tailwind *classes* (color, border, radius, shadow, type — the themeable look),
 * and **structural** defaults live in inline *styles* (positioning: position,
 * offsets, z-index, the display/sizing that makes the component lay out). The
 * helpers below encode the policy: `unstyled` drops the visual class layer but
 * keeps structure (so a restyled component still appears in the right place);
 * `unstyled: 'all'` drops the structural inline layer too. Either way, `styles`
 * overrides can change positioning explicitly.
 */

/**
 * How aggressively to drop a component's built-in defaults.
 * - `false` / omitted → keep all defaults.
 * - `true` → drop the **visual** (class) defaults; **keep** structural inline
 *   positioning so the component still lays out. Pair with `classNames` to supply
 *   your own look.
 * - `'all'` → drop **everything**, including positioning (you own the layout).
 *   Positioning can also always be changed via `styles` without going this far.
 */
export type Unstyled = boolean | 'all';

/** Join truthy class fragments into one className string. */
export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

/**
 * A per-slot class override.
 * - a **string** is merged onto the slot's default (appended);
 * - a **function** receives the default (`''` when dropped) and returns the
 *   final class — full control: `() => 'x'` replaces, `(d) => `${d} x`` merges.
 */
export type ClassOverride = string | ((defaultClassName: string) => string);

/** A per-slot inline-style override: an object merged over the default (per-key
 *  wins), or a function `(default) => next` for full control. */
export type StyleOverride = CSSProperties | ((defaultStyle: CSSProperties) => CSSProperties);

/** Resolve a slot's final className. Any truthy `unstyled` (`true` or `'all'`)
 *  empties the visual default first, so a string override becomes the whole class
 *  and a function sees `''`. */
export const resolveClass = (defaultClassName: string, override?: ClassOverride, unstyled?: Unstyled): string => {
  const base = unstyled ? '' : defaultClassName;
  return typeof override === 'function' ? override(base) : cx(base, override);
};

/** Resolve a slot's final (structural) inline style. Only `unstyled: 'all'` drops
 *  the default — plain `unstyled: true` keeps positioning. Otherwise an object
 *  override is spread over the default (per-key wins) and a function gets the
 *  default and returns the final. Returns `undefined` when empty (so the DOM
 *  `style` attribute stays absent). */
export const resolveStyle = (
  defaultStyle: CSSProperties = {},
  override?: StyleOverride,
  unstyled?: Unstyled,
): CSSProperties | undefined => {
  const base = unstyled === 'all' ? {} : defaultStyle;
  const merged = typeof override === 'function' ? override(base) : override ? { ...base, ...override } : base;
  return Object.keys(merged).length ? merged : undefined;
};

/**
 * The standard styling-override props every styled cwip/react component accepts.
 * `Slot` is the component's union of slot names. Components also accept top-level
 * `className`/`style` as a shortcut for their `root` slot (back-compat / brevity).
 */
export interface StyleableProps<Slot extends string> {
  /** Per-slot class overrides — string merges, function fully controls. */
  classNames?: Partial<Record<Slot, ClassOverride>>;
  /** Per-slot inline-style overrides — object merges, function fully controls. */
  styles?: Partial<Record<Slot, StyleOverride>>;
  /** Drop built-in defaults: `true` drops the visual look but keeps positioning;
   *  `'all'` drops positioning too. See {@link Unstyled}. */
  unstyled?: Unstyled;
}
