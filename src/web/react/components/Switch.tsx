import type { ChangeEvent } from 'react';
import { cx, resolveClass, type StyleableProps } from '../styling';

export type SwitchSlot = 'root' | 'input' | 'track' | 'thumb';

export interface SwitchProps extends StyleableProps<SwitchSlot> {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  /** Set when the Switch sits inside a `<label htmlFor=…>` so the visible toggle
   *  (the sr-only checkbox's sibling) associates correctly. */
  id?: string;
}

/** An accessible on/off toggle (a visually-hidden checkbox + a styled track and
 *  thumb). Tailwind-first, overridable per slot (`root`/`input`/`track`/`thumb`). */
export const Switch = ({ checked, onChange, name, id, classNames, unstyled }: SwitchProps) => (
  <div className={resolveClass('relative', classNames?.root, unstyled)}>
    <input
      type="checkbox"
      id={id}
      name={name}
      checked={checked}
      onChange={onChange}
      className={resolveClass('peer absolute opacity-0', classNames?.input, unstyled)}
    />
    <div
      aria-checked={checked}
      role="switch"
      aria-label="switch"
      tabIndex={0}
      className={resolveClass(
        cx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-1 shadow-inner ring-gray-400 transition-all peer-focus-visible:ring-3 peer-focus-visible:ring-offset-1',
          checked ? 'bg-accent' : 'bg-gray-400',
        ),
        classNames?.track,
        unstyled,
      )}
    >
      <div
        className={resolveClass(
          cx('h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all', checked && 'translate-x-3.5'),
          classNames?.thumb,
          unstyled,
        )}
      />
    </div>
  </div>
);
