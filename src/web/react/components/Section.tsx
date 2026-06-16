import type { CSSProperties, ReactNode } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type SectionSpacing = 'default' | 'hero' | 'compact';
export type SectionBordered = 'none' | 'top' | 'bottom' | 'y';
export type SectionSlot = 'root';

const SPACING: Record<SectionSpacing, string> = {
  default: 'py-16',
  hero: 'py-20 sm:py-28',
  compact: 'py-8',
};

const BORDERED: Record<SectionBordered, string> = {
  none: '',
  top: 'border-t border-gray-200 dark:border-gray-800',
  bottom: 'border-b border-gray-200 dark:border-gray-800',
  y: 'border-y border-gray-200 dark:border-gray-800',
};

export interface SectionProps extends StyleableProps<SectionSlot> {
  spacing?: SectionSpacing;
  bordered?: SectionBordered;
  muted?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A vertical-rhythm band with optional muted background and dividing borders. */
export const Section = ({
  spacing = 'default',
  bordered = 'none',
  muted = false,
  id,
  children,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: SectionProps) => (
  <section
    id={id}
    className={resolveClass(
      cx(id && 'scroll-mt-20', SPACING[spacing], BORDERED[bordered], muted && 'bg-gray-50 dark:bg-gray-900/40'),
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
  >
    {children}
  </section>
);
