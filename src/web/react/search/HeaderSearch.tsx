import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import { resolveClass, type StyleableProps } from '../styling';

// useLayoutEffect warns (and never runs) on the server; alias it to useEffect there
// so SSR (e.g. renderToStaticMarkup in tests) stays quiet, while the client still
// measures before paint — no collapse/expand flash on the first render.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Default magnifying glass. Sized by `className` so the small inline leading icon
// (16px, inside the field) and the larger standalone collapsed trigger (24px, a
// header tap target that should read at the same size as its neighbor header icons)
// can share one glyph. Override the glyph entirely via the `icon` prop.
const SearchGlyph = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" className={className}>
    <circle cx="9" cy="9" r="6.25" />
    <path d="m17 17-3.6-3.6" strokeLinecap="round" />
  </svg>
);

/** Back/close chevron used in the expanded mobile overlay. */
const BackGlyph = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true" className="h-5 w-5">
    <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type HeaderSearchSlot =
  | 'root'
  | 'inputWrap'
  | 'icon'
  | 'input'
  | 'trigger'
  | 'panel'
  | 'backdrop'
  | 'overlay'
  | 'overlayBar'
  | 'overlayResults';

export interface HeaderSearchProps extends StyleableProps<HeaderSearchSlot> {
  /** The query text (controlled — drive your search off this, e.g. via `useDebouncedValue`). */
  value: string;
  /** Called with the next query on each keystroke. */
  onChange: (value: string) => void;
  /** Input placeholder (default `'Search…'`). */
  placeholder?: string;
  /** Accessible name for the input and the collapsed trigger button (default `'Search'`). */
  label?: string;
  /** Leading glyph; defaults to a magnifying glass. */
  icon?: ReactNode;
  /**
   * The dropdown body — typically a {@link SearchResults}. Given a `close()` that
   * collapses the search (wire it to result navigation alongside clearing `value`).
   * Rendered only while the search is open and `value` has at least `minChars`.
   */
  children?: (close: () => void) => ReactNode;
  /** Min trimmed length before the results panel opens (default `1`). */
  minChars?: number;
  /**
   * Collapse to a single magnifying-glass icon when the search's available width
   * drops below this many px — it then expands to a full-width overlay that drops
   * down on tap (the small-screen default, so no app special-cases the iPhone). The
   * width is measured from the component's own flex track, so it reflects the real
   * space left after its neighbors: crowd the header and it collapses sooner,
   * independent of the raw viewport width. Default `240`.
   */
  collapseBelow?: number;
  /** `'auto'` measures the track (default); `'always'`/`'never'` pin the layout. */
  collapseMode?: 'auto' | 'always' | 'never';
  /** Notified whenever the search closes (Escape / outside tap / `close()`). */
  onClose?: () => void;
}

const PANEL =
  'absolute left-0 right-0 top-full z-40 mt-1 max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900';
const OVERLAY_SURFACE = 'border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';

/**
 * Decide whether the search collapses to its icon. Pure + testable: `'always'`/
 * `'never'` pin it; `'auto'` collapses once a *measured* track width is below
 * `collapseBelow` (a `null` width — before the first measurement — never collapses,
 * so it paints as the full field by default).
 */
export const shouldCollapseSearch = (
  trackWidth: number | null,
  collapseBelow: number,
  mode: 'auto' | 'always' | 'never',
): boolean => {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return trackWidth !== null && trackWidth < collapseBelow;
};

/**
 * A responsive header / top-nav search: a full search field where there's room, and
 * a single magnifying-glass icon where there isn't — tapping the icon expands a
 * full-width overlay that drops down from the top (the small-screen default, so no
 * app has to special-case narrow phones). It owns the responsive collapse, the
 * focus/open state, and the floating dropdown + mobile overlay shells; the app owns
 * the query (`value`/`onChange`) and what the dropdown shows (`children`, usually a
 * {@link SearchResults}). Routing/data stay app-side — pair with `useDebouncedValue`
 * to fire a request as the user pauses typing.
 */
export const HeaderSearch = ({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  icon,
  children,
  minChars = 1,
  collapseBelow = 240,
  collapseMode = 'auto',
  onClose,
  classNames,
  unstyled,
}: HeaderSearchProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [trackWidth, setTrackWidth] = useState<number | null>(null);
  const panelId = useId();

  // Measure the available track width so collapse reflects real space, not a fixed
  // viewport breakpoint. Loop-free: the root keeps its `grow` size whether it renders
  // the field or just the icon, so the measurement never feeds back on itself.
  useIsoLayoutEffect(() => {
    if (collapseMode !== 'auto') return;
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setTrackWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapseMode]);

  const collapsed = shouldCollapseSearch(trackWidth, collapseBelow, collapseMode);
  const open = active && value.trim().length >= minChars;

  const close = useCallback(() => {
    setActive(false);
    onClose?.();
  }, [onClose]);

  // Focus the field when the collapsed overlay opens.
  useEffect(() => {
    if (active && collapsed) inputRef.current?.focus();
  }, [active, collapsed]);

  // Dismiss on outside tap / Escape while engaged. The dropdown + overlay are DOM
  // descendants of the root (even the fixed overlay), so one containment check covers
  // both — a tap inside the results doesn't close before a link's onClick fires.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, close]);

  // The icon + input pair, reused inline (wide) or inside the overlay (collapsed).
  // Only one branch mounts at a time, so the shared `inputRef` is unambiguous.
  const iconInput = (
    <>
      <span
        aria-hidden
        className={resolveClass(
          'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400',
          classNames?.icon,
          unstyled,
        )}
      >
        {icon ?? <SearchGlyph />}
      </span>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setActive(true);
        }}
        onFocus={() => setActive(true)}
        className={resolveClass('pl-8', classNames?.input, unstyled)}
      />
    </>
  );

  const rootClass = resolveClass('relative flex min-w-0 grow items-center', classNames?.root, unstyled);

  if (collapsed) {
    return (
      <div ref={rootRef} className={rootClass}>
        <IconButton
          label={label}
          aria-expanded={active}
          onClick={() => setActive((a) => !a)}
          classNames={{ root: classNames?.trigger }}
          unstyled={unstyled}
        >
          {/* 24px glyph (vs the 16px inline leading icon) so the standalone search
              tap target reads at the same size as the other header icons. */}
          {icon ?? <SearchGlyph className="h-6 w-6" />}
        </IconButton>
        {active && (
          <>
            <button
              type="button"
              aria-label="Close search"
              tabIndex={-1}
              onClick={close}
              className={resolveClass(
                'fixed inset-0 z-40 bg-gray-900/20 dark:bg-gray-950/50',
                classNames?.backdrop,
                unstyled,
              )}
            />
            <div className={resolveClass('fixed inset-x-0 top-0 z-50', classNames?.overlay, unstyled)}>
              <div
                className={resolveClass(
                  `flex items-center gap-2 p-3 ${OVERLAY_SURFACE}`,
                  classNames?.overlayBar,
                  unstyled,
                )}
              >
                <IconButton label="Close search" onClick={close}>
                  <BackGlyph />
                </IconButton>
                <div className="relative flex-1">{iconInput}</div>
              </div>
              {open && children && (
                <div
                  id={panelId}
                  className={resolveClass(
                    `max-h-[70vh] overflow-auto p-3 shadow-xl ${OVERLAY_SURFACE}`,
                    classNames?.overlayResults,
                    unstyled,
                  )}
                >
                  {children(close)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={rootClass}>
      <div className={resolveClass('relative w-full max-w-md', classNames?.inputWrap, unstyled)}>
        {iconInput}
        {open && children && (
          <div id={panelId} className={resolveClass(PANEL, classNames?.panel, unstyled)}>
            {children(close)}
          </div>
        )}
      </div>
    </div>
  );
};
