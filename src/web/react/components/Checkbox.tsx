import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { resolveClass, type StyleableProps } from '../styling';

export type CheckboxSlot = 'root' | 'label' | 'input';

export interface CheckboxProps
  extends StyleableProps<CheckboxSlot>,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'type' | 'onChange'> {
  /** Optional caption shown next to the box. */
  label?: ReactNode;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** A labeled checkbox. The whole control is a `<label>` so the caption is
 *  clickable. Overridable per slot (`root`, `label`, `input`). */
export const Checkbox = ({ label, checked, onChange, classNames, unstyled, ...rest }: CheckboxProps) => (
  <label className={resolveClass('inline-flex items-center gap-2', classNames?.root, unstyled)}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={resolveClass('accent-accent', classNames?.input, unstyled)}
      {...rest}
    />
    {label != null && <span className={resolveClass('text-sm', classNames?.label, unstyled)}>{label}</span>}
  </label>
);
