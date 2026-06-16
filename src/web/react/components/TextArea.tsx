import type { CSSProperties, KeyboardEvent } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { AutoGrowTextarea, type AutoGrowTextareaProps } from './AutoGrowTextarea';
import { FIELD_CLASS } from './field';

export type TextAreaSlot = 'root';

export interface TextAreaProps
  extends StyleableProps<TextAreaSlot>,
    Omit<AutoGrowTextareaProps, 'className' | 'style'> {
  /** Called when Enter is pressed while focused (scoped, not global). */
  onEnter?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  style?: CSSProperties;
}

/** An auto-growing textarea with the shared field styling. Spreads native textarea
 *  attributes; `onEnter` fires on Enter while focused. Overridable per slot. */
export const TextArea = ({
  onEnter,
  onKeyDown,
  className,
  style,
  classNames,
  styles,
  unstyled,
  ...rest
}: TextAreaProps) => (
  <AutoGrowTextarea
    className={resolveClass(FIELD_CLASS, classNames?.root ?? className, unstyled)}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
    onKeyDown={(e) => {
      onKeyDown?.(e);
      if (e.key === 'Enter') onEnter?.(e);
    }}
    {...rest}
  />
);
