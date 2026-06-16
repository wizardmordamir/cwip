/** Preferred horizontal direction the nav row's kebab menu opens. */
export type NavMenuAlign = 'left' | 'right';

/** The resolved viewport coordinates of an open nav kebab menu. */
export interface NavMenuPlacement {
  /** `position: fixed` top (px, viewport-based). */
  top: number;
  /** `position: fixed` left (px, viewport-based). */
  left: number;
  /** Max height (px) so a tall menu scrolls in place instead of running off-screen
   *  — apply as inline `maxHeight` paired with `overflow-y: auto`. */
  maxHeight: number;
}

export interface NavMenuPlacementInput {
  /** Trigger's viewport rect (from `getBoundingClientRect()`). */
  triggerRect: { top: number; bottom: number; left: number; right: number };
  /** Measured menu size (the popover's own `getBoundingClientRect()`). */
  menuSize: { width: number; height: number };
  /** Visible viewport (`window.innerWidth`/`innerHeight`). */
  viewport: { width: number; height: number };
  /** Preferred horizontal open direction. `'left'` (default) opens rightward —
   *  toward the content — from the trigger's left edge; `'right'` anchors the
   *  menu's right edge to the trigger (opens leftward). Either way the result is
   *  clamped, so the side is only a preference. */
  align?: NavMenuAlign;
  /** Gap between trigger and menu, in px (default 6). */
  gap?: number;
  /** Minimum margin kept from every viewport edge, in px (default 8). */
  margin?: number;
}

/**
 * Place a side-nav row's kebab menu against the viewport so it is **always fully
 * on-screen**, regardless of how narrow the sidebar is. The old menu was an
 * `absolute right-0 w-56` popover that opened leftward and spilled off the left
 * edge of a narrow sidebar; this computes viewport coordinates for a
 * `position: fixed` menu (rendered in a portal, so no `overflow`/`opacity`/
 * `transform` ancestor in the draggable, hover-revealed row can clip, fade, or
 * mis-anchor it).
 *
 * The menu opens below the trigger, flipping above only when there isn't room
 * below but there is above; horizontally it opens toward the content side (or
 * leftward for `align='right'`). Both axes are then clamped into the viewport
 * (the upper bound floors at `margin`, so a menu larger than the viewport still
 * starts on-screen rather than at a negative offset). Pure + testable so the DOM
 * wiring in {@link NavItemMenu} stays trivial.
 */
export function computeNavMenuPlacement({
  triggerRect,
  menuSize,
  viewport,
  align = 'left',
  gap = 6,
  margin = 8,
}: NavMenuPlacementInput): NavMenuPlacement {
  const { width: vw, height: vh } = viewport;

  // Open below the trigger; flip above when there's no room below but room above.
  let top = triggerRect.bottom + gap;
  const overflowsBelow = top + menuSize.height + margin > vh;
  const roomAbove = triggerRect.top - menuSize.height - gap >= margin;
  if (overflowsBelow && roomAbove) top = triggerRect.top - menuSize.height - gap;

  // Open rightward (toward the content) by default; leftward for `align='right'`.
  let left = align === 'right' ? triggerRect.right - menuSize.width : triggerRect.left;

  // Clamp both axes; the upper bound floors at `margin` so an oversized menu still
  // starts on-screen rather than at a negative coordinate.
  left = Math.min(Math.max(left, margin), Math.max(margin, vw - menuSize.width - margin));
  top = Math.min(Math.max(top, margin), Math.max(margin, vh - menuSize.height - margin));

  // Cap height to the viewport (less the top/bottom margins) so a tall menu
  // scrolls in place rather than overflowing.
  const maxHeight = Math.max(120, vh - 2 * margin);

  return { top, left, maxHeight };
}
