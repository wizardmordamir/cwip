import type { ReactNode } from 'react';
import { resolveClass, type StyleableProps } from '../styling';

export type EmptyStateSlot = 'root' | 'icon' | 'title' | 'description' | 'action';

export interface EmptyStateProps extends StyleableProps<EmptyStateSlot> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** A friendly dashed-border placeholder for "nothing here yet" states. */
export const EmptyState = ({ icon, title, description, action, className, classNames, unstyled }: EmptyStateProps) => (
  <div
    className={resolveClass(
      'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700',
      classNames?.root ?? className,
      unstyled,
    )}
  >
    {icon && <div className={resolveClass('text-gray-400 dark:text-gray-500', classNames?.icon, unstyled)}>{icon}</div>}
    <p className={resolveClass('text-lg font-semibold text-gray-900 dark:text-gray-100', classNames?.title, unstyled)}>
      {title}
    </p>
    {description && (
      <p
        className={resolveClass('max-w-md text-sm text-gray-600 dark:text-gray-400', classNames?.description, unstyled)}
      >
        {description}
      </p>
    )}
    {action && <div className={resolveClass('mt-2', classNames?.action, unstyled)}>{action}</div>}
  </div>
);
