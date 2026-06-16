import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'lg' | '2xl' | '3xl';
export type CardSlot = 'root' | 'content';

const PADDING: Record<CardPadding, string> = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-8' };
const RADIUS: Record<CardRadius, string> = { lg: 'rounded-lg', '2xl': 'rounded-2xl', '3xl': 'rounded-3xl' };

export interface CardProps extends StyleableProps<CardSlot> {
  /** Render as a link to this destination (see `linkComponent`). */
  to?: string;
  /** The element/component for the link form (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  interactive?: boolean;
  padding?: CardPadding;
  radius?: CardRadius;
  /** A hex accent (e.g. `'#3b82f6'`): faint full tint + colored left bar + border. */
  accentColor?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The canonical surface card: white / gray-900 with a subtle border. `interactive`
 * adds the hover-lift for clickable cards; pass `to` (+ optionally `linkComponent`)
 * to render it as a link. An `accentColor` tints it and adds a colored left bar.
 * Overridable per slot (`root`, `content`).
 */
export const Card = ({
  to,
  linkComponent: Link = 'a',
  interactive,
  padding = 'md',
  radius = '2xl',
  accentColor,
  children,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: CardProps) => {
  const rootClass = resolveClass(
    cx(
      'border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
      RADIUS[radius],
      PADDING[padding],
      interactive &&
        'group transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg dark:hover:border-gray-700',
      accentColor && 'relative overflow-hidden',
      to && 'block',
    ),
    classNames?.root ?? className,
    unstyled,
  );
  // Inline border color overrides the gray Tailwind border in both themes.
  const rootStyle = resolveStyle(accentColor ? { borderColor: accentColor } : {}, styles?.root ?? style, unstyled);

  // Tint + left bar paint behind the content; both pointer-events-none so a link
  // stays clickable. Content gets its own stacking context above them.
  const inner = accentColor ? (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: accentColor, opacity: 0.1 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: accentColor }}
      />
      <span className={resolveClass('relative z-[1] block', classNames?.content, unstyled)}>{children}</span>
    </>
  ) : (
    children
  );

  if (to) {
    const targetProps = Link === 'a' ? { href: to } : { to };
    return (
      <Link {...targetProps} className={rootClass} style={rootStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={rootClass} style={rootStyle}>
      {inner}
    </div>
  );
};
