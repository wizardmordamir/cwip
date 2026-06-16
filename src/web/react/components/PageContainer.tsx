import type { CSSProperties, ReactNode } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type PageContainerSize = 'default' | 'narrow' | 'wide';
export type PageContainerSlot = 'root';

const SIZE: Record<PageContainerSize, string> = {
  default: 'max-w-6xl',
  narrow: 'max-w-3xl',
  wide: 'max-w-7xl',
};

export interface PageContainerProps extends StyleableProps<PageContainerSlot> {
  size?: PageContainerSize;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Centered, max-width content column with consistent horizontal padding. */
export const PageContainer = ({
  size = 'default',
  children,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: PageContainerProps) => (
  <div
    className={resolveClass(cx('mx-auto w-full px-6', SIZE[size]), classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
  >
    {children}
  </div>
);
