import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { InfoHint } from '../InfoHint';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';

export type FieldLabelSlot = 'root';

export interface FieldLabelProps
  extends StyleableProps<FieldLabelSlot>,
    Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
  children: ReactNode;
  /** Optional "ⓘ" help shown inline after the label — a richer, click-to-pin
   *  explanation of the field (renders an {@link InfoHint}). Use it for fields
   *  whose meaning isn't obvious from the caption alone. */
  hint?: ReactNode;
  /** Bold heading for the hint panel. Defaults to the label text when `children`
   *  is a plain string. */
  hintTitle?: ReactNode;
  /** Which edge the hint panel hangs from (default `'left'`; use `'right'` for a
   *  field near the right edge of the layout so the panel doesn't overflow). */
  hintAlign?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
}

/** The standard form-field caption: a block, medium-weight label above an input.
 *  Rendered as a `<span>` (a caption, not a form-associated `<label htmlFor>`).
 *  Pass `hint` to append an inline "ⓘ" help affordance documenting the field. */
export const FieldLabel = ({
  children,
  hint,
  hintTitle,
  hintAlign,
  className,
  style,
  classNames,
  styles,
  unstyled,
  ...rest
}: FieldLabelProps) => (
  <span
    className={resolveClass(
      'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300',
      classNames?.root ?? className,
      unstyled,
    )}
    style={resolveStyle({}, styles?.root ?? style, unstyled)}
    {...rest}
  >
    {children}
    {hint != null && hint !== false && (
      <InfoHint
        title={hintTitle ?? (typeof children === 'string' ? children : undefined)}
        align={hintAlign}
        className="ml-1 align-middle"
      >
        {hint}
      </InfoHint>
    )}
  </span>
);
