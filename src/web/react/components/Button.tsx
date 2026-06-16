import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { type TooltipPlacement, withTooltip } from '../Tooltip';

export type ButtonVariant = 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'default' | 'ghost';
export type ButtonSize = 'sm' | 'md';
export type ButtonShape = 'rounded' | 'pill';

// Shared button look, readable in light + dark. `primary` is the neutral
// (black/white) action; `accent` the themeable brand CTA (fills with the host
// app's `accent` token, defaulting to emerald — see ./theme.css); `default` the
// clean outline; `ghost` borderless. Exposed via getButtonClasses so <Button>
// and <ButtonLink> stay visually identical.
const BASE_CLASS =
  'inline-flex items-center justify-center gap-1.5 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';

const SHAPE_CLASS: Record<ButtonShape, string> = {
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

// On touch devices (pointer-coarse) every button gets a ~44px-tall hit target and
// a slightly larger label; desktop/mouse sizing stays compact.
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs pointer-coarse:min-h-11 pointer-coarse:px-3.5 pointer-coarse:text-sm',
  md: 'px-3 py-1.5 text-sm pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:text-base',
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-gray-900 text-white hover:bg-gray-700 focus-visible:ring-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200',
  accent: 'bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent',
  success: 'bg-green-600 text-white hover:bg-green-500 focus-visible:ring-green-500',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500',
  warning:
    'bg-amber-400 text-amber-950 hover:bg-amber-300 focus-visible:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400',
  default:
    'border border-gray-300 text-gray-700 hover:bg-gray-100 focus-visible:ring-accent dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
  ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-accent dark:text-gray-200 dark:hover:bg-gray-800',
};

// Disabled drops the colored fill for a clearly-muted neutral style (a faded
// colored fill with grey text reads as a low-contrast haze).
const DISABLED_CLASS =
  'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500';

export interface ButtonLookProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
}

/** Compose the shared button class string. Shared by {@link Button} and
 *  {@link ButtonLink} so the two render identically. */
export const getButtonClasses = ({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  className = '',
}: ButtonLookProps & { disabled?: boolean; className?: string } = {}): string =>
  cx(BASE_CLASS, SHAPE_CLASS[shape], SIZE_CLASS[size], disabled ? DISABLED_CLASS : VARIANT_CLASS[variant], className);

export type ButtonSlot = 'root';

export interface ButtonProps
  extends ButtonLookProps,
    StyleableProps<ButtonSlot>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'type'> {
  children?: ReactNode;
  /** Convenience label rendered after `children`. */
  text?: string;
  /** Native button type (default `'button'`). */
  htmlType?: 'button' | 'submit' | 'reset';
  /** Hover/focus explanation of what the button does — the standard way to
   *  document an action whose label alone isn't self-evident. Wraps the button
   *  in a multiline {@link Tooltip}. */
  tooltip?: ReactNode;
  /** Where the `tooltip` bubble sits (default `'top'`). */
  tooltipPlacement?: TooltipPlacement;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

/**
 * The shared button. Tailwind-first, variant/size/shape props, overridable per
 * slot (`root`) via `classNames`/`styles`/`unstyled`. Spreads native button
 * attributes (`onClick`, `disabled`, `aria-*`, …).
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  children,
  text,
  htmlType = 'button',
  tooltip,
  tooltipPlacement,
  className,
  style,
  classNames,
  styles,
  unstyled,
  disabled,
  ...rest
}: ButtonProps) => {
  const button = (
    <button
      type={htmlType}
      disabled={!!disabled}
      className={resolveClass(
        getButtonClasses({ variant, size, shape, disabled: !!disabled }),
        classNames?.root ?? className,
        unstyled,
      )}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
      {...rest}
    >
      {children}
      {text}
    </button>
  );
  return withTooltip(button, tooltip, tooltipPlacement);
};
