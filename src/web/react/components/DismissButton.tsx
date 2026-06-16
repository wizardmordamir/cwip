import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type DismissButtonSlot = 'root';

export interface DismissButtonProps
  extends StyleableProps<DismissButtonSlot>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'type' | 'aria-label'> {
  /** Accessible name for the icon-only control, e.g. "Hide Budgets". */
  label: string;
  /** Glyph/icon to render; defaults to a "✕". Pass an icon node to match a host app. */
  icon?: ReactNode;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

const DEFAULT_CLASS =
  'inline-flex items-center justify-center rounded p-1 leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-rose-600 dark:hover:bg-gray-800 dark:hover:text-rose-400';

/**
 * The "✕" remove/hide affordance shared by dismissible cards, dashboard widget
 * frames, hub tiles, and list rows. Icon-only — pass `label` for the accessible
 * name (also the default tooltip). Tailwind-first, overridable via the styling
 * system; pass `icon` to use a host app's own close/trash glyph.
 */
export const DismissButton = ({
  label,
  icon,
  title,
  className,
  style,
  classNames,
  styles,
  unstyled,
  ...rest
}: DismissButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={title ?? label}
    className={resolveClass(DEFAULT_CLASS, classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
    {...rest}
  >
    {icon ?? '✕'}
  </button>
);
