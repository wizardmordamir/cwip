import type { CSSProperties, ReactNode } from 'react';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { BADGE_TONES, type BadgeTone } from './badgeTones';

export type BadgeSlot = 'root';

export interface BadgeProps extends StyleableProps<BadgeSlot> {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A soft, rounded pill label. Tones cover light + dark (see {@link BADGE_TONES}). */
export const Badge = ({ tone = 'neutral', children, className, style, classNames, styles, unstyled }: BadgeProps) => (
  <span
    className={resolveClass(
      cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide', BADGE_TONES[tone]),
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
  >
    {children}
  </span>
);
