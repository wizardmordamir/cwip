import type { ReactNode } from 'react';

export interface PageBottomProps {
  /** Extra content (e.g. a sticky toolbar) to render above the spacer. */
  children?: ReactNode;
}

/**
 * Universal bottom spacer — drop it at the end of every scrollable page.
 *
 * On mobile (< md) it reserves 33 vh so the last row can always be scrolled
 * fully above the ShortcutDock (a fixed ~60-95 px bottom strip). On desktop it
 * reserves 6 rem + the iOS safe-area home-indicator inset + the on-screen
 * keyboard height (tracked by `useKeyboardInset` on `--keyboard-inset`).
 *
 * `pointer-events-none` is essential: a flex-col page whose content is taller
 * than its shrunk flex item (e.g. a full-bleed canvas with controls below it)
 * can render UNDER this spacer — without it the transparent div would silently
 * swallow pointer events on those bottom controls.
 *
 * Install `useKeyboardInset` once near the app root so `--keyboard-inset` is
 * always defined; without it the spacer falls back to `0px` for that variable.
 *
 * Requires `viewport-fit=cover` in the `<meta name="viewport">` tag for
 * `env(safe-area-inset-bottom)` to report the actual iOS home-indicator
 * height (it returns `0px` without that flag).
 */
export const PageBottom = ({ children }: PageBottomProps = {}) => (
  <>
    {children}
    <div
      aria-hidden="true"
      className="pointer-events-none shrink-0 h-[33vh] md:h-[calc(6rem+env(safe-area-inset-bottom,0px)+var(--keyboard-inset,0px))]"
    />
  </>
);
