import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { cx, resolveClass, type StyleableProps } from '../styling';
import { ColorSwatchGrid } from './ColorSwatchGrid';
import { computeNavMenuPlacement, type NavMenuAlign, type NavMenuPlacement } from './navMenuPlacement';

export type NavItemMenuSlot = 'root' | 'trigger' | 'backdrop' | 'popover' | 'header' | 'sectionLabel' | 'hide';

export interface NavItemMenuProps extends StyleableProps<NavItemMenuSlot> {
  /** Entry title, for the accessible name + the popover header. */
  label: string;
  color?: string;
  onColor: (color: string | undefined) => void;
  onHide: () => void;
  /** App-specific actions appended below "Hide from sidebar". */
  children?: ReactNode;
  /** Preferred horizontal open direction (default `'left'` = opens rightward,
   *  toward the content). The menu is always clamped on-screen, so this is only a
   *  preference — see {@link computeNavMenuPlacement}. */
  align?: NavMenuAlign;
  /** Trigger glyph (default a vertical ellipsis). */
  icon?: ReactNode;
  /** The owning row's icon, echoed in the popover header so the menu visibly names
   *  the item it belongs to (alongside {@link label}). */
  headerIcon?: ReactNode;
  hideLabel?: string;
  /** Notified whenever the menu opens/closes, so the owning row can highlight itself
   *  while its menu is up (the row keeps the open-state, this just reports it). */
  onOpenChange?: (open: boolean) => void;
}

// useLayoutEffect positions the menu before the browser paints (no flicker); fall
// back to useEffect on the server so SSR doesn't warn. The menu only renders on a
// client click, so this never actually runs during SSR.
const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const TRIGGER_CLASS =
  'flex h-6 w-6 items-center justify-center rounded leading-none text-gray-400 transition hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200 pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]';
// While the menu is open, hold the trigger in its hover/active look so the kebab the
// popover belongs to stays visibly "pressed" instead of fading back out.
const TRIGGER_OPEN_CLASS = 'bg-black/5 text-gray-600 dark:bg-white/10 dark:text-gray-200';
// Solid, elevated surface so the content behind never bleeds through (the old menu
// rode the nav row's hover-opacity and went see-through). Positioning is the inline
// layer (so it works even when `unstyled` drops these classes).
const POPOVER_CLASS =
  'w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900 dark:ring-white/10';
// Names the owning row at the top of the popover (icon + label) so the menu is never
// ambiguous about which nav item it acts on.
const HEADER_CLASS = 'mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-800';
const HEADER_ICON_CLASS = 'shrink-0 text-base';
const HEADER_LABEL_CLASS = 'truncate text-sm font-semibold text-gray-900 dark:text-gray-100';
const SECTION_LABEL_CLASS = 'mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400';
const HIDE_CLASS =
  'mt-3 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-600 transition hover:bg-gray-100 hover:text-rose-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-rose-400';

/**
 * The per-row "⋮" options popover: recolor (an inline {@link ColorSwatchGrid}),
 * hide from the sidebar, plus any app-specific `children` actions. The trigger is a
 * sibling of a draggable, hover-revealed nav row, so the menu is rendered in a
 * **portal** with viewport-anchored `position: fixed` — this frees it from the
 * row's `overflow` (no clipping), `opacity` (no see-through fade), and `transform`
 * (no mis-anchoring) ancestors, and is clamped so it's always fully on-screen even
 * in a narrow sidebar. Visibility is driven purely by `open`, so the menu only
 * appears on an explicit kebab click — never on hover — and a full-screen backdrop
 * absorbs clicks/hover over the rest of the nav while it's open.
 */
export const NavItemMenu = ({
  label,
  color,
  onColor,
  onHide,
  children,
  align = 'left',
  icon = '⋮',
  headerIcon,
  hideLabel = 'Hide from sidebar',
  onOpenChange,
  classNames,
  unstyled,
}: NavItemMenuProps) => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<NavMenuPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEscapeKey(() => setOpen(false), open);

  // Report open/close so the owning row can highlight itself while its menu is up.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // While open, measure the trigger + the (first-pass, hidden) menu and place it
  // against the viewport; recompute on scroll/resize so it tracks the trigger.
  useIsoLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const place = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (triggerRect && menu) {
        setPlacement(
          computeNavMenuPlacement({
            triggerRect,
            menuSize: { width: menu.width, height: menu.height },
            viewport: { width: window.innerWidth, height: window.innerHeight },
            align,
          }),
        );
      }
    };
    place();
    window.addEventListener('resize', place);
    // Capture so an ancestor scroll container (the nav list) also repositions.
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  return (
    <div className={resolveClass('relative', classNames?.root, unstyled)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Options for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Options"
        // Don't let pressing the kebab arm a row drag, and don't navigate the row.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={resolveClass(cx(TRIGGER_CLASS, open && TRIGGER_OPEN_CLASS), classNames?.trigger, unstyled)}
      >
        {icon}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close"
              className={resolveClass('fixed inset-0', classNames?.backdrop, unstyled)}
              style={{ zIndex: 999 }}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Options for ${label}`}
              className={resolveClass(POPOVER_CLASS, classNames?.popover, unstyled)}
              style={{
                position: 'fixed',
                top: placement ? placement.top : 0,
                left: placement ? placement.left : 0,
                zIndex: 1000,
                // Hidden for the first (measuring) layout pass, revealed once placed.
                visibility: placement ? 'visible' : 'hidden',
                maxHeight: placement ? placement.maxHeight : undefined,
              }}
            >
              <div className={resolveClass(HEADER_CLASS, classNames?.header, unstyled)}>
                {headerIcon != null && headerIcon !== false && (
                  <span aria-hidden className={HEADER_ICON_CLASS}>
                    {headerIcon}
                  </span>
                )}
                <span className={HEADER_LABEL_CLASS}>{label}</span>
              </div>
              <p className={resolveClass(SECTION_LABEL_CLASS, classNames?.sectionLabel, unstyled)}>Color</p>
              <ColorSwatchGrid value={color} onChange={onColor} onCommit={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => {
                  onHide();
                  setOpen(false);
                }}
                className={resolveClass(HIDE_CLASS, classNames?.hide, unstyled)}
              >
                {hideLabel}
              </button>
              {children}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};
