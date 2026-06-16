import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { type TooltipPlacement, withTooltip } from '../Tooltip';

const ICON_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]';

export type IconButtonSlot = 'root';

export interface IconButtonProps
  extends StyleableProps<IconButtonSlot>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'type' | 'aria-label'> {
  /** The accessible name (always set as `aria-label`) AND, by default, the hover
   *  tooltip (native `title`) — so icon-only buttons always explain themselves. */
  label: string;
  children: ReactNode;
  /** A richer hover/focus explanation than `label`. When set, the button is
   *  wrapped in a styled multiline {@link Tooltip} (and the plain native `title`
   *  is dropped to avoid a double tooltip); `label` still names it for a11y. */
  tooltip?: ReactNode;
  /** Where the `tooltip` bubble sits (default `'top'`). */
  tooltipPlacement?: TooltipPlacement;
  /** Stop the click bubbling (e.g. an action button inside a clickable row). */
  stopPropagation?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** An icon-only button that's always labeled + tooltipped. Pass `tooltip` for a
 *  styled, multi-line explanation; otherwise the `label` shows as a native title.
 *  Tailwind-first; on touch it enforces a ≥44px hit area, compact on desktop. */
export const IconButton = ({
  label,
  children,
  tooltip,
  tooltipPlacement,
  stopPropagation,
  onClick,
  className,
  style,
  classNames,
  styles,
  unstyled,
  ...rest
}: IconButtonProps) => {
  const button = (
    <button
      type="button"
      aria-label={label}
      // A rich `tooltip` provides the hover text via the styled bubble, so the
      // native title would just duplicate it; fall back to title={label} otherwise.
      title={tooltip ? undefined : label}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      className={resolveClass(ICON_BUTTON_CLASS, classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
      {...rest}
    >
      {children}
    </button>
  );
  return withTooltip(button, tooltip, tooltipPlacement);
};
