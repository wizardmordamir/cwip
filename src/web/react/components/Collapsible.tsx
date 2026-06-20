import { type ReactNode, useId, useState } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';

// The cwip disclosure primitives — one place that owns how a "click to open a
// section" control looks and, crucially, WHERE its arrow sits. The arrow lives on
// the LEFT (leading edge) of the header by design: changing it here moves it for
// every consumer, instead of each page hand-rolling a trailing `▸/▾` span. Three
// layers, smallest first, so a page reaches for exactly what it needs:
//   - DisclosureArrow  — the rotating chevron glyph (presentational, aria-hidden).
//   - DisclosureButton — a header <button> = arrow-on-the-left + your content,
//     owning the click + `aria-expanded`. Use when the body is rendered yourself.
//   - Collapsible      — header + body wrapper (controlled or uncontrolled). Use
//     for a brand-new section that wants both managed in one place.

export type DisclosureArrowSlot = 'root';

export interface DisclosureArrowProps extends StyleableProps<DisclosureArrowSlot> {
  /** Whether the section it controls is open — rotates the chevron 90° when true. */
  open: boolean;
  /** Edge length of the (square) chevron; any CSS length. Defaults to `0.75em` so
   *  it scales with the surrounding text. */
  size?: number | string;
  className?: string;
}

/**
 * The standard cwip disclosure arrow: a chevron that points right when closed and
 * rotates down (90°) when open. Purely presentational and `aria-hidden` — pair it
 * with a control that owns the click + `aria-expanded` (see {@link DisclosureButton}).
 */
export const DisclosureArrow = ({
  open,
  size = '0.75em',
  className,
  classNames,
  styles,
  unstyled,
}: DisclosureArrowProps) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable={false}
    width={size}
    height={size}
    className={resolveClass(
      cx('shrink-0 transition-transform duration-150', open && 'rotate-90'),
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({}, styles?.root, unstyled)}
  >
    <path
      d="M9 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export type DisclosureButtonSlot = 'root' | 'arrow';

export interface DisclosureButtonProps extends StyleableProps<DisclosureButtonSlot> {
  /** Whether the controlled section is open. */
  open: boolean;
  /** Called when the header is activated (the caller flips `open`). */
  onToggle: () => void;
  /** Header content shown after the leading arrow. */
  children: ReactNode;
  /** Size forwarded to the {@link DisclosureArrow}. */
  arrowSize?: number | string;
  /** `id` of the region this button controls, wired to `aria-controls`. */
  controls?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A section-opener header: the {@link DisclosureArrow} on the **left**, then your
 * content, in one `<button>` that owns the click and `aria-expanded`. Reach for
 * this when the collapsible body is rendered by the caller (the common retrofit);
 * use {@link Collapsible} when you want the body managed too.
 */
export const DisclosureButton = ({
  open,
  onToggle,
  children,
  arrowSize,
  controls,
  id,
  disabled,
  className,
  classNames,
  styles,
  unstyled,
}: DisclosureButtonProps) => (
  <button
    type="button"
    id={id}
    aria-expanded={open}
    aria-controls={controls}
    disabled={disabled}
    onClick={onToggle}
    className={resolveClass('flex w-full items-center gap-2 text-left', classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root, unstyled)}
  >
    <DisclosureArrow
      open={open}
      size={arrowSize}
      classNames={{ root: classNames?.arrow }}
      styles={{ root: styles?.arrow }}
      unstyled={unstyled}
    />
    {children}
  </button>
);

export type CollapsibleSlot = 'root' | 'header' | 'arrow' | 'content';

export interface CollapsibleProps extends StyleableProps<CollapsibleSlot> {
  /** The always-visible header content shown next to the leading arrow. */
  header: ReactNode;
  /** The collapsible body, revealed when open. */
  children?: ReactNode;
  /** Controlled open state. Omit to let the component manage its own (see
   *  {@link CollapsibleProps.defaultOpen}). */
  open?: boolean;
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Notified with the next open state whenever the header is toggled. */
  onOpenChange?: (open: boolean) => void;
  /** Keep the body mounted (hidden) when closed instead of unmounting it — useful
   *  when the body holds state you don't want to lose. Defaults to `false`. */
  keepMounted?: boolean;
  /** Size forwarded to the {@link DisclosureArrow}. */
  arrowSize?: number | string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * A self-contained collapsible section: a {@link DisclosureButton} header (arrow on
 * the left) plus the body it reveals. Works **controlled** (`open` + `onOpenChange`)
 * or **uncontrolled** (`defaultOpen`). The body is unmounted while closed unless
 * `keepMounted` is set.
 */
export const Collapsible = ({
  header,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  keepMounted = false,
  arrowSize,
  disabled,
  id,
  className,
  classNames,
  styles,
  unstyled,
}: CollapsibleProps) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const reactId = useId();
  const contentId = `${id ?? reactId}-content`;

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={resolveClass('', classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root, unstyled)}
    >
      <DisclosureButton
        open={isOpen}
        onToggle={toggle}
        disabled={disabled}
        controls={contentId}
        arrowSize={arrowSize}
        classNames={{ root: classNames?.header, arrow: classNames?.arrow }}
        styles={{ root: styles?.header, arrow: styles?.arrow }}
        unstyled={unstyled}
      >
        {header}
      </DisclosureButton>
      {(isOpen || keepMounted) && (
        <div
          id={contentId}
          hidden={!isOpen}
          className={resolveClass('', classNames?.content, unstyled)}
          style={resolveStyle({}, styles?.content, unstyled)}
        >
          {children}
        </div>
      )}
    </div>
  );
};
