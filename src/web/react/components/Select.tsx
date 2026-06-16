import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { FIELD_CLASS_AUTO } from './field';

export type SelectSlot = 'root';

export interface SelectProps
  extends StyleableProps<SelectSlot>,
    Omit<ComponentPropsWithRef<'select'>, 'className' | 'style'> {
  className?: string;
  style?: CSSProperties;
}

/** A select with the shared field styling (no `w-full`, so it can sit at its own
 *  width in a flex row). Spreads native select attributes; overridable per slot. */
export const Select = ({ children, className, style, classNames, styles, unstyled, ...rest }: SelectProps) => (
  <select
    className={resolveClass(FIELD_CLASS_AUTO, classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
    {...rest}
  >
    {children}
  </select>
);
