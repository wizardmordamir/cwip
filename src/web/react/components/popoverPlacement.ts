/** Vertical direction a popover/dropdown opens relative to its trigger. */
export type PopoverDirection = 'auto' | 'down' | 'up';

/** The resolved vertical placement of a popover. */
export interface PopoverPlacement {
  /** Concrete side the popover opens toward. */
  dir: 'down' | 'up';
  /** Max height (px) the popover may take so it stays within the viewport — apply
   *  as an inline `maxHeight` and pair with `overflow-y: auto` so a long list
   *  scrolls in place instead of running off-screen. */
  maxHeight: number;
}

export interface PopoverPlacementInput {
  /** Trigger's viewport rect (the `top`/`bottom` of `getBoundingClientRect()`). */
  triggerRect: { top: number; bottom: number };
  /** Visible viewport height (e.g. `window.innerHeight`). */
  viewportHeight: number;
  /** Requested direction; `'auto'` flips to whichever side has more room. */
  direction?: PopoverDirection;
  /** Gap between trigger and popover, in px (default 8). */
  gap?: number;
  /** Floor for the computed max height so a cramped side still shows a few rows
   *  and stays scrollable rather than collapsing to a sliver (default 120). */
  minHeight?: number;
}

/**
 * Decide which way a popover should open and how tall it may be so it never runs
 * off-screen — the shared geometry behind the {@link AddItemsMenu} "Show hidden"
 * restore menu (which sits at the bottom of the side-nav, where a downward popover
 * would be clipped below the viewport). `'auto'` opens downward when there's at
 * least as much room below the trigger as above, otherwise upward; an explicit
 * `'down'`/`'up'` is honored but its `maxHeight` is still clamped to the room on
 * that side. `maxHeight` is floored at `minHeight` so a tight fit yields a
 * scrollable list rather than a zero-height sliver. Pure + testable so the DOM
 * wiring stays trivial.
 */
export function computePopoverPlacement({
  triggerRect,
  viewportHeight,
  direction = 'auto',
  gap = 8,
  minHeight = 120,
}: PopoverPlacementInput): PopoverPlacement {
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const dir: 'down' | 'up' =
    direction === 'down' ? 'down' : direction === 'up' ? 'up' : spaceBelow >= spaceAbove ? 'down' : 'up';
  const room = (dir === 'down' ? spaceBelow : spaceAbove) - gap;
  return { dir, maxHeight: Math.max(minHeight, Math.floor(room)) };
}
