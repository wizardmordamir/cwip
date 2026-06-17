import type { ComponentPropsWithRef, CSSProperties, KeyboardEvent } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { FIELD_CLASS } from './field';

export type InputSlot = 'root';

export interface InputProps
  extends StyleableProps<InputSlot>,
    Omit<ComponentPropsWithRef<'input'>, 'className' | 'style'> {
  /** Called when Enter is pressed *while this input is focused* (scoped, not global). */
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A text input with the shared field styling. Spreads native input attributes;
 * `onEnter` fires on Enter while focused. Overridable per slot (`root`).
 *
 * Defaults to maxLength=1_000 for single-line inputs — override for fields
 * that legitimately need more (e.g. URL inputs, content fields).
 */
export const Input = ({ onEnter, onKeyDown, className, style, classNames, styles, unstyled, maxLength = 1_000, ...rest }: InputProps) => (
  <input
    className={resolveClass(FIELD_CLASS, classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
    maxLength={maxLength}
    onKeyDown={(e) => {
      onKeyDown?.(e);
      if (e.key === 'Enter') onEnter?.(e);
    }}
    {...rest}
  />
);
