import type { CSSProperties, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type PageSlot = 'root';

export interface PageProps extends StyleableProps<PageSlot> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Full-bleed page shell: the canonical app surface (light + dark). Wrap a page's
 *  body so it sits on the right background and text color. */
export const Page = ({ children, className, style, classNames, styles, unstyled }: PageProps) => (
  <div
    className={resolveClass(
      'min-h-full w-full bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100',
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
  >
    {children}
  </div>
);
