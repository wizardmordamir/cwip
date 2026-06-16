import type { CSSProperties } from 'react';
import { cx } from '../styling';

export interface DropIndicatorProps {
  /** `'horizontal'` = a line across the top/bottom edge (vertical lists);
   *  `'vertical'` = a line down the left/right edge (columns / grids). */
  orientation: 'horizontal' | 'vertical';
  /** Which edge of the hovered item the line sits on: `'start'` = top/left,
   *  `'end'` = bottom/right. */
  side: 'start' | 'end';
  /** Override the line color outright (e.g. a one-off). By default it fills with
   *  the host app's themeable `accent` token (see ./theme.css). */
  color?: string;
}

/**
 * A drop-placement indicator for drag-reorder: an accent-colored line at the exact
 * gap where the dragged item will land (themeable via the `accent` token, or the
 * `color` prop for a one-off). The positioned parent (the hovered item) must be
 * `relative`; the line is absolutely placed and centered on the chosen edge.
 * Pairs with `useDragReorder`'s `insertBefore`/`insertAfter`.
 *
 * The dragged item floats over this line (`useDragReorder` keeps it translucent),
 * so the line is drawn bold — a thick bar with a crisp ring + a bright accent glow
 * halo that bleeds past the item's edges — to stay unmistakable underneath it.
 */
export const DropIndicator = ({ orientation, side, color }: DropIndicatorProps) => {
  const tone = color ?? 'var(--color-accent)';
  const style: CSSProperties = {
    // 1px ring keeps a sharp edge; the soft outer halo bleeds beyond the dragged
    // item so the insertion point reads even directly under it.
    boxShadow: `0 0 0 1px ${tone}, 0 0 10px 2px ${tone}`,
    ...(color ? { backgroundColor: color } : {}),
  };
  const base = 'pointer-events-none absolute z-30 rounded-full bg-accent';
  if (orientation === 'horizontal') {
    const pos = side === 'start' ? '-top-px -translate-y-1/2' : '-bottom-px translate-y-1/2';
    return <span aria-hidden className={cx(base, 'inset-x-0 h-1', pos)} style={style} />;
  }
  const pos = side === 'start' ? '-left-px -translate-x-1/2' : '-right-px translate-x-1/2';
  return <span aria-hidden className={cx(base, 'inset-y-0 w-1', pos)} style={style} />;
};
