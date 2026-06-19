import type { ReactNode } from 'react';
import { useEffect } from 'react';

/**
 * Named bottom-space presets. `default` is the universal spacing every page gets;
 * the others let a page ask for more (`roomy`) or less (`compact`/`none`) clearance
 * via the `space` prop or — for a single shell-level spacer — `usePageBottomSpace`.
 */
export type PageBottomSpace = 'none' | 'compact' | 'default' | 'roomy';

/** Explicit spacer heights: any CSS length for mobile (`base`) and md+ (`md`). */
export interface PageBottomSpaceValue {
  base: string;
  md: string;
}

// Each preset is a COMPLETE literal class pair (mobile + md) so Tailwind's JIT can
// see it when scanning cwip's dist. The height reads a CSS variable whose *fallback*
// is the preset's default — so the visual default is unchanged, AND any page can
// override the (typically single, shell-level) spacer at runtime via
// `usePageBottomSpace`, which writes that variable onto `<html>`. No prop drilling:
// one `<PageBottom/>` in the app shell still honours a per-page request.
const SPACE_CLASS: Record<PageBottomSpace, string> = {
  none: 'h-[var(--page-bottom-space,0px)] md:h-[var(--page-bottom-space-md,0px)]',
  compact:
    'h-[var(--page-bottom-space,16vh)] md:h-[var(--page-bottom-space-md,calc(3rem+env(safe-area-inset-bottom,0px)+var(--keyboard-inset,0px)))]',
  default:
    'h-[var(--page-bottom-space,33vh)] md:h-[var(--page-bottom-space-md,calc(6rem+env(safe-area-inset-bottom,0px)+var(--keyboard-inset,0px)))]',
  roomy:
    'h-[var(--page-bottom-space,50vh)] md:h-[var(--page-bottom-space-md,calc(10rem+env(safe-area-inset-bottom,0px)+var(--keyboard-inset,0px)))]',
};

// The CSS length each preset resolves to — mirrors the SPACE_CLASS fallbacks. The
// override hook writes these onto `<html>` as plain CSS (NOT through Tailwind), so
// they keep the spaces CSS `calc()` requires around `+`/`-`.
const SPACE_VALUE: Record<PageBottomSpace, PageBottomSpaceValue> = {
  none: { base: '0px', md: '0px' },
  compact: { base: '16vh', md: 'calc(3rem + env(safe-area-inset-bottom, 0px) + var(--keyboard-inset, 0px))' },
  default: { base: '33vh', md: 'calc(6rem + env(safe-area-inset-bottom, 0px) + var(--keyboard-inset, 0px))' },
  roomy: { base: '50vh', md: 'calc(10rem + env(safe-area-inset-bottom, 0px) + var(--keyboard-inset, 0px))' },
};

export interface PageBottomProps {
  /** Extra content (e.g. a sticky toolbar) to render above the spacer. */
  children?: ReactNode;
  /**
   * The instance's default spacer size — the app shell's "set up once" knob.
   * A page can still override it at runtime with `usePageBottomSpace`. Defaults
   * to `default` (the universal spacing).
   */
  space?: PageBottomSpace;
}

/**
 * Universal bottom spacer — drop it at the end of every scrollable page (typically
 * once, in the app shell, after the routed content).
 *
 * On mobile (< md) it reserves 33 vh so the last row can always be scrolled fully
 * above a fixed bottom strip (e.g. a ShortcutDock). On desktop it reserves 6 rem +
 * the iOS safe-area home-indicator inset + the on-screen keyboard height (tracked
 * by `useKeyboardInset` on `--keyboard-inset`).
 *
 * The height is driven by `--page-bottom-space` / `--page-bottom-space-md` with the
 * `space` preset as the fallback, so any page can ask for more or less clearance at
 * runtime by calling `usePageBottomSpace(...)`: the single shell-level spacer
 * honours it with no prop drilling, and reverts when that page unmounts.
 *
 * `pointer-events-none` is essential: a flex-col page whose content is taller than
 * its shrunk flex item (e.g. a full-bleed canvas with controls below it) can render
 * UNDER this spacer — without it the transparent div would silently swallow pointer
 * events on those bottom controls.
 *
 * Install `useKeyboardInset` once near the app root so `--keyboard-inset` is always
 * defined; without it the spacer falls back to `0px` for that variable.
 *
 * Requires `viewport-fit=cover` in the `<meta name="viewport">` tag for
 * `env(safe-area-inset-bottom)` to report the actual iOS home-indicator height (it
 * returns `0px` without that flag).
 */
export const PageBottom = ({ children, space = 'default' }: PageBottomProps = {}) => (
  <>
    {children}
    <div aria-hidden="true" className={`pointer-events-none shrink-0 ${SPACE_CLASS[space]}`} />
  </>
);

/**
 * Override the universal `PageBottom` spacer for the current page. Call it from any
 * page that needs more or less bottom clearance than the shell default; pass a
 * preset name or an explicit `{ base, md }` height pair, or `null`/`undefined` to
 * leave the default untouched. The override is reverted automatically when the page
 * unmounts.
 *
 * It publishes `--page-bottom-space` / `--page-bottom-space-md` on `<html>` — the
 * same mechanism as `useKeyboardInset` — which the shell's `<PageBottom />` reads,
 * so a single spacer instance honours a per-page request without prop drilling.
 */
export const usePageBottomSpace = (space: PageBottomSpace | PageBottomSpaceValue | null | undefined): void => {
  const value = space == null ? null : typeof space === 'string' ? SPACE_VALUE[space] : space;
  const base = value?.base ?? null;
  const md = value?.md ?? null;
  useEffect(() => {
    if (base == null || md == null) return;
    const root = document.documentElement;
    root.style.setProperty('--page-bottom-space', base);
    root.style.setProperty('--page-bottom-space-md', md);
    return () => {
      root.style.removeProperty('--page-bottom-space');
      root.style.removeProperty('--page-bottom-space-md');
    };
  }, [base, md]);
};
