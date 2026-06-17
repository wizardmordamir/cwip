import { type CSSProperties, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveClass, resolveStyle, type StyleableProps } from './styling';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/** The styleable slots: the inline-block wrapper and the floating bubble. */
export type TooltipSlot = 'root' | 'bubble';

export interface TooltipProps extends StyleableProps<TooltipSlot> {
  /** The tooltip content. */
  content: ReactNode;
  /** The trigger element(s). */
  children: ReactNode;
  /** The *preferred* side the bubble sits on (default `'top'`). It auto-flips to
   *  the opposite side when the preferred one doesn't fit, and is always clamped
   *  so the bubble can't spill off the viewport. */
  placement?: TooltipPlacement;
  /** Let the bubble wrap onto multiple lines (width-capped) instead of the
   *  single-line `whitespace-nowrap` default — use it for a real explanation
   *  rather than a one-word label. Implied when `maxWidth` is set. */
  multiline?: boolean;
  /** Cap the bubble width (a number is px). Implies `multiline`; defaults to
   *  `16rem` when `multiline` is on. */
  maxWidth?: number | string;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

// useLayoutEffect positions the bubble before the browser paints (no flicker);
// fall back to useEffect on the server so SSR doesn't warn.
const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

// Gap between the trigger and the bubble, and the minimum margin we keep from the
// viewport edge when clamping.
const GAP = 6;
const MARGIN = 8;

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

interface Coords {
  top: number;
  left: number;
}

// Place the bubble next to the trigger on the side that actually fits, then clamp
// to the viewport so it's never partly off-screen. Coordinates are viewport-based
// (the bubble is `position: fixed` rendered via a portal into document.body, which
// frees it from any `overflow:hidden` ancestor AND from CSS-transformed ancestors
// that would otherwise make `position:fixed` relative to them instead of the viewport).
const computeCoords = (trigger: DOMRect, bubble: DOMRect, preferred: TooltipPlacement): Coords => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const space = { top: trigger.top, bottom: vh - trigger.bottom, left: trigger.left, right: vw - trigger.right };
  const fits = (s: TooltipPlacement): boolean =>
    s === 'top'
      ? space.top >= bubble.height + GAP + MARGIN
      : s === 'bottom'
        ? space.bottom >= bubble.height + GAP + MARGIN
        : s === 'left'
          ? space.left >= bubble.width + GAP + MARGIN
          : space.right >= bubble.width + GAP + MARGIN;

  // Flip to the opposite side only when the preferred side can't fit but its
  // opposite can — otherwise keep the preferred side and rely on clamping.
  const side = !fits(preferred) && fits(OPPOSITE[preferred]) ? OPPOSITE[preferred] : preferred;

  let top: number;
  let left: number;
  if (side === 'top') {
    top = trigger.top - bubble.height - GAP;
    left = trigger.left + trigger.width / 2 - bubble.width / 2;
  } else if (side === 'bottom') {
    top = trigger.bottom + GAP;
    left = trigger.left + trigger.width / 2 - bubble.width / 2;
  } else if (side === 'left') {
    left = trigger.left - bubble.width - GAP;
    top = trigger.top + trigger.height / 2 - bubble.height / 2;
  } else {
    left = trigger.right + GAP;
    top = trigger.top + trigger.height / 2 - bubble.height / 2;
  }

  // Clamp both axes into the viewport (the upper bound floors at MARGIN so a
  // bubble larger than the viewport still starts on-screen rather than negative).
  left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - bubble.width - MARGIN));
  top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - bubble.height - MARGIN));
  return { top, left };
};

// Visual defaults are Tailwind classes (themeable / dark-mode aware); positioning
// (incl. stacking) is the structural inline layer, so the bubble is placed
// correctly even when `unstyled` drops the visual classes.
const BUBBLE_CLASS =
  'pointer-events-none whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-md dark:bg-gray-700';

// `multiline` swaps nowrap for wrapping + left-aligned text, so the bubble can
// hold a full explanation (width-capped via `maxWidth`, default 16rem).
const BUBBLE_MULTILINE_CLASS =
  'pointer-events-none whitespace-normal break-words rounded bg-gray-900 px-2 py-1 text-left text-xs leading-snug text-white shadow-md dark:bg-gray-700';

/**
 * An accessible, hover/focus tooltip. Wraps its trigger in an inline-block span
 * and shows `content` on mouse-enter or keyboard focus, wired with
 * `aria-describedby`. The floating bubble is measured and positioned against the
 * viewport, so it picks the side that fits (auto-flipping `placement` when needed)
 * and is clamped to never spill off-screen. Tailwind-first visuals, overridable
 * per slot (`root`, `bubble`) via `classNames`/`styles`/`unstyled` — see
 * {@link StyleableProps}.
 *
 *   <Tooltip content="Copy to clipboard"><button>Copy</button></Tooltip>
 */
export const Tooltip = ({
  content,
  children,
  placement = 'top',
  multiline,
  maxWidth,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const wrap = Boolean(multiline) || maxWidth != null;
  const resolvedMaxWidth =
    maxWidth != null ? (typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth) : wrap ? '16rem' : undefined;

  // While open, measure the trigger + bubble and position the bubble; recompute on
  // scroll/resize so it tracks the trigger. Runs after the bubble mounts (rendered
  // hidden on the first pass), so the very first paint is already in the right spot.
  useIsoLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      const bubble = bubbleRef.current?.getBoundingClientRect();
      if (trigger && bubble) setCoords(computeCoords(trigger, bubble, placement));
    };
    place();
    window.addEventListener('resize', place);
    // Capture so an ancestor scroll container (not just the window) also repositions.
    window.addEventListener('scroll', place, true);
    // Close when the window loses focus: a click that opens a focus-stealing native
    // surface (file picker, alert/confirm, print, a new tab) blurs the window without
    // ever firing mouseleave/blur on the trigger, which would otherwise strand the
    // bubble open after the surface closes and focus returns to the still-hovered/
    // focused trigger.
    const close = () => setOpen(false);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('blur', close);
    };
  }, [open, placement, content, multiline, maxWidth, resolvedMaxWidth]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus wrapper around an arbitrary trigger; focus handlers keep it keyboard-accessible.
    <span
      ref={rootRef}
      className={resolveClass('', classNames?.root ?? className, unstyled)}
      style={resolveStyle({ position: 'relative', display: 'inline-block' }, styles?.root ?? style, unstyled)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      // Activating the trigger dismisses the bubble: the action usually changes
      // context (opens a dialog/menu, navigates), and the trigger often keeps focus
      // afterward, so without this the tooltip lingers even when no longer hovered.
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            id={id}
            className={resolveClass(wrap ? BUBBLE_MULTILINE_CLASS : BUBBLE_CLASS, classNames?.bubble, unstyled)}
            style={resolveStyle(
              {
                position: 'fixed',
                top: coords ? coords.top : 0,
                left: coords ? coords.left : 0,
                zIndex: 1000,
                // Hidden for the first (measuring) layout pass, revealed once placed.
                visibility: coords ? 'visible' : 'hidden',
                ...(resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : {}),
              },
              styles?.bubble,
              unstyled,
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
};

/**
 * Wrap `trigger` in a multiline {@link Tooltip} when `content` is given, else
 * return it untouched. The shared primitive behind the `tooltip` prop on
 * {@link Button} / `ButtonLink` / `IconButton`, so a button can explain itself
 * with one prop: `<Button tooltip="what this does">Label</Button>`.
 */
export const withTooltip = (trigger: ReactNode, content: ReactNode, placement: TooltipPlacement = 'top'): ReactNode => {
  if (content == null || content === false || content === '') return trigger;
  return (
    <Tooltip content={content} placement={placement} multiline>
      {trigger}
    </Tooltip>
  );
};
