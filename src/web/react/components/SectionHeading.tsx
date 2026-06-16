import type { ReactNode } from 'react';
import { resolveClass, type StyleableProps } from '../styling';

export type SectionHeadingSlot = 'root' | 'title';

export interface SectionHeadingProps extends StyleableProps<SectionHeadingSlot> {
  children: ReactNode;
  /** Optional trailing action (e.g. a "View all →" link). */
  action?: ReactNode;
  className?: string;
}

/** An in-page section title (text-2xl bold) with an optional trailing action. */
export const SectionHeading = ({ children, action, className, classNames, unstyled }: SectionHeadingProps) => (
  <div className={resolveClass('mb-8 flex items-end justify-between gap-4', classNames?.root ?? className, unstyled)}>
    <h2
      className={resolveClass(
        'text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100',
        classNames?.title,
        unstyled,
      )}
    >
      {children}
    </h2>
    {action}
  </div>
);
