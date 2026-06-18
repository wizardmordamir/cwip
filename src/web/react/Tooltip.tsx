import { type CSSProperties, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHasHover } from './hooks/useHasHover';
import { resolveClass, resolveStyle, type StyleableProps } from './styling';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * How the tooltip surfaces on **touch** (no-hover) devices, where there is no
 * pointer hover to reveal it:
 * - `'icon'` — append a small, accessible disclosure icon after the trigger; a
 *   tap toggles the bubble (tap again / tap outside / Escape closes). Best when
 *   the bubble carries info the user would otherwise never see.
 * - `'tap'` — no extra icon: tapping the trigger itself reveals the bubble, which
 *   auto-dismisses shortly after (and on an outside tap / Escape). Best when the
 *   trigger is already a meaningful control (a button) whose tooltip is just a
 *   supplementary hint — this is what the `tooltip` prop on `Button`/`IconButton`
 *   uses, so toolbars don't sprout a "?" beside every icon.
 * - `'off'` — no touch affordance at all (hover/focus only, the legacy behavior).
 */
export type TooltipMobile = 'icon' | 'tap' | 'off';

/** The styleable slots: the inline-block wrapper, the floating bubble, and (on
 *  touch, in `mobile: 'icon'` mode) the disclosure icon. */
export type TooltipSlot = 'root' | 'bubble' | 'icon';

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
  /** Touch-device behavior (hover doesn't exist there). Default `'icon'`. See
   *  {@link TooltipMobile}. Has no effect on hover-capable devices. */
  mobile?: TooltipMobile;
  /** Custom node for the touch disclosure icon (default a small "ⓘ"). Only used
   *  when `mobile` is `'icon'` and the device lacks hover. */
  mobileIcon?: ReactNode;
  /** Shortcut for `classNames.icon` — Tailwind classes for the disclosure icon. */
  iconClassName?: string;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

// How long a `mobile: 'tap'` bubble stays up after the tap before auto-dismissing
// (it also closes on an outside tap / Escape). Long enough to read a short hint.
const TAP_DISMISS_MS = 2500;

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

// The touch disclosure icon: a small "ⓘ" circle sitting just after the trigger.
// Themeable (hover/focus adopt the app's `accent`); a ≥44px tap target isn't
// forced here so it stays inline with the trigger, but the hit area is generous
// for its size. Override via `iconClassName` / `classNames.icon`.
const ICON_CLASS =
  'ml-1 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-current align-middle text-gray-400 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none';

// The default disclosure glyph — the same "i" mark as InfoHint, for consistency.
const DEFAULT_MOBILE_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="11"
    height="11"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <title>Info</title>
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </svg>
);

/**
 * An accessible tooltip that works on **both** pointer and touch devices. On a
 * hover-capable device it shows `content` on mouse-enter or keyboard focus; on a
 * touch device (no hover) it falls back per the `mobile` prop — by default it
 * appends a small tappable "ⓘ" disclosure icon (`mobile: 'icon'`), or reveals on
 * a tap of the trigger (`'tap'`). Either way the floating bubble is measured and
 * positioned against the viewport, picking the side that fits (auto-flipping
 * `placement`) and clamped to never spill off-screen, and is wired with
 * `aria-describedby`. Tailwind-first visuals, overridable per slot (`root`,
 * `bubble`, `icon`) via `classNames`/`styles`/`unstyled` — see {@link StyleableProps}.
 *
 *   <Tooltip content="Copy to clipboard"><button>Copy</button></Tooltip>
 *   // touch: a "?" icon, custom-styled, instead of the default "ⓘ"
 *   <Tooltip content="What this does" mobileIcon={<HelpCircle />} iconClassName="text-blue-500">
 *     <span>Field label</span>
 *   </Tooltip>
 */
export const Tooltip = ({
  content,
  children,
  placement = 'top',
  multiline,
  maxWidth,
  mobile = 'icon',
  mobileIcon,
  iconClassName,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: TooltipProps) => {
  // Two independent open sources: hover/focus (pointer devices) and an explicit
  // touch "pin" (tap the disclosure icon or, in `'tap'` mode, the trigger). The
  // bubble shows when either is set.
  const [hoverOpen, setHoverOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  // No content → behave like a passthrough: no bubble, no disclosure icon (so a
  // conditionally-empty `content` never shows a stray "ⓘ" with an empty bubble).
  const hasContent = content != null && content !== false && content !== '';
  const open = (hoverOpen || touchOpen) && hasContent;

  const hasHover = useHasHover();
  const touch = !hasHover;
  const showIcon = touch && mobile === 'icon' && hasContent;
  // On touch, tapping the trigger reveals the bubble: explicit in `'tap'` mode,
  // and also the only way to open in `'icon'` mode (the icon owns that tap).
  const tapToReveal = touch && mobile === 'tap' && hasContent;

  const wrap = Boolean(multiline) || maxWidth != null;
  const resolvedMaxWidth =
    maxWidth != null ? (typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth) : wrap ? '16rem' : undefined;

  const clearTapTimer = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  };
  // Clear any pending auto-dismiss timer on unmount (no leak).
  useEffect(() => () => clearTimeout(tapTimer.current ?? undefined), []);

  // While a touch-pinned bubble is open, an outside tap or Escape closes it.
  // (Hover/focus opens close themselves via mouseleave/blur and need no listeners.)
  useEffect(() => {
    if (!touchOpen) return;
    const close = () => {
      clearTimeout(tapTimer.current ?? undefined);
      tapTimer.current = null;
      setTouchOpen(false);
    };
    const onDown = (e: PointerEvent | MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [touchOpen]);

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
    const close = () => {
      setHoverOpen(false);
      setTouchOpen(false);
    };
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
      // Hover/focus drive the bubble only on pointer devices; on touch they'd
      // fire spuriously (synthetic mouseenter on tap), so the touch paths own it.
      onMouseEnter={touch ? undefined : () => setHoverOpen(true)}
      onMouseLeave={touch ? undefined : () => setHoverOpen(false)}
      onFocus={touch ? undefined : () => setHoverOpen(true)}
      onBlur={touch ? undefined : () => setHoverOpen(false)}
      onClick={() => {
        if (tapToReveal) {
          // Tap the trigger to reveal; auto-dismiss after a beat (also closes on
          // outside tap / Escape). A second tap toggles it back off immediately.
          clearTapTimer();
          setTouchOpen((prev) => {
            if (prev) return false;
            tapTimer.current = setTimeout(() => setTouchOpen(false), TAP_DISMISS_MS);
            return true;
          });
          return;
        }
        // Pointer device: activating the trigger dismisses the bubble — the action
        // usually changes context (opens a dialog/menu, navigates) and the trigger
        // often keeps focus, so without this the tooltip lingers. (In `'icon'` mode
        // the disclosure icon owns its own tap and stops propagation.)
        if (!touch) setHoverOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setHoverOpen(false);
          setTouchOpen(false);
        }
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {showIcon && (
        <button
          type="button"
          aria-label="More info"
          aria-expanded={open}
          aria-describedby={open ? id : undefined}
          onClick={(e) => {
            // Don't let the tap also reach the trigger (which may navigate/submit).
            e.preventDefault();
            e.stopPropagation();
            setTouchOpen((prev) => !prev);
          }}
          className={resolveClass(ICON_CLASS, classNames?.icon ?? iconClassName, unstyled)}
          style={resolveStyle({}, styles?.icon, unstyled)}
        >
          {mobileIcon ?? DEFAULT_MOBILE_ICON}
        </button>
      )}
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
 *
 * Uses `mobile: 'tap'` (not the default disclosure icon): the trigger is already a
 * meaningful button, so on touch the hint reveals on tap and auto-dismisses rather
 * than appending a "?" beside every icon button in a toolbar.
 */
export const withTooltip = (trigger: ReactNode, content: ReactNode, placement: TooltipPlacement = 'top'): ReactNode => {
  if (content == null || content === false || content === '') return trigger;
  return (
    <Tooltip content={content} placement={placement} multiline mobile="tap">
      {trigger}
    </Tooltip>
  );
};
