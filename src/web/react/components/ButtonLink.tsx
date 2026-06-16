import type { CSSProperties, ElementType, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { type TooltipPlacement, withTooltip } from '../Tooltip';
import { type ButtonLookProps, getButtonClasses } from './Button';

export type ButtonLinkSlot = 'root';

export interface ButtonLinkProps extends ButtonLookProps, StyleableProps<ButtonLinkSlot> {
  /** Destination. Passed as `href` when rendering an anchor, or as `to` when a
   *  custom `linkComponent` (e.g. react-router's `Link`) is supplied. */
  to: string;
  /** The element/component to render. Defaults to a plain `<a>`; pass your
   *  router's `Link` to integrate with client-side routing. */
  linkComponent?: ElementType;
  onClick?: () => void;
  children?: ReactNode;
  /** Hover/focus explanation, wrapping the link in a multiline {@link Tooltip}. */
  tooltip?: ReactNode;
  /** Where the `tooltip` bubble sits (default `'top'`). */
  tooltipPlacement?: TooltipPlacement;
  className?: string;
  style?: CSSProperties;
}

/**
 * A link styled exactly like a {@link Button} (shares `getButtonClasses`). Renders
 * a plain anchor by default; pass `linkComponent={Link}` to use a router link.
 * Defaults to the neutral `default` outline variant, which suits nav / "back"
 * links.
 *
 *   <ButtonLink to="/home" linkComponent={Link}>Home</ButtonLink>
 */
export const ButtonLink = ({
  to,
  linkComponent: Link = 'a',
  variant = 'default',
  size = 'md',
  shape = 'rounded',
  onClick,
  children,
  tooltip,
  tooltipPlacement,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: ButtonLinkProps) => {
  const targetProps = Link === 'a' ? { href: to } : { to };
  const link = (
    <Link
      {...targetProps}
      onClick={onClick}
      className={resolveClass(getButtonClasses({ variant, size, shape }), classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      {children}
    </Link>
  );
  return withTooltip(link, tooltip, tooltipPlacement);
};
