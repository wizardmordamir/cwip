import type { ReactNode } from 'react';
import { cx, resolveClass, type StyleableProps } from '../styling';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export type SegmentedControlSlot = 'root' | 'option';

export interface SegmentedControlProps<T extends string> extends StyleableProps<SegmentedControlSlot> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Capitalize labels (e.g. lowercase view keys like 'month'/'agenda'). */
  capitalize?: boolean;
  className?: string;
}

/** A segmented toggle (tabs / view switcher): a bordered group where the active
 *  button is accent-filled (themeable; see ./theme.css). Overridable per slot
 *  (`root`, `option`). */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  capitalize = false,
  className,
  classNames,
  unstyled,
}: SegmentedControlProps<T>) => (
  <div
    className={resolveClass(
      'inline-flex w-fit max-w-full overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700',
      classNames?.root ?? className,
      unstyled,
    )}
  >
    {options.map((opt) => (
      <button
        type="button"
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={resolveClass(
          cx(
            'shrink-0 whitespace-nowrap px-2.5 py-1.5 text-sm font-medium transition sm:px-4 pointer-coarse:min-h-11 pointer-coarse:px-4',
            capitalize && 'capitalize',
            value === opt.value
              ? 'bg-accent text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
          ),
          classNames?.option,
          unstyled,
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
