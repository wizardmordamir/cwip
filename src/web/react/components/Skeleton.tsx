import type { CSSProperties } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';

const toCss = (v: string | number | undefined) => (v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v);

export type SkeletonSlot = 'root';

export interface SkeletonProps extends StyleableProps<SkeletonSlot> {
  /** Convenience sizing so callers don't need Tailwind arbitrary values. */
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A single shimmering placeholder block. Compose several to mirror a page's real
 *  layout so the content area keeps its shape (no collapse → no flash) while loading. */
export const Skeleton = ({
  width,
  height,
  rounded = true,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: SkeletonProps) => (
  <div
    aria-hidden
    className={resolveClass(
      cx('animate-pulse bg-gray-200 dark:bg-gray-800', rounded && 'rounded-md'),
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({ width: toCss(width), height: toCss(height) }, styles?.root ?? style, unstyled)}
  />
);

export interface SkeletonListProps extends StyleableProps<'root'> {
  rows?: number;
  className?: string;
}

/** A stack of full-width rows — the sensible default skeleton for list/table pages. */
export const SkeletonList = ({ rows = 6, className, classNames, unstyled }: SkeletonListProps) => (
  <div className={resolveClass('flex flex-col gap-3', classNames?.root ?? className, unstyled)} aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows
      <Skeleton key={`skeleton-row-${i}`} height={56} />
    ))}
  </div>
);
