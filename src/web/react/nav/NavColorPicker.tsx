import { useState } from 'react';
import { resolveClass, type StyleableProps } from '../styling';
import { ColorSwatchGrid } from './ColorSwatchGrid';

export type NavColorPickerSlot = 'root' | 'trigger' | 'dot' | 'backdrop' | 'popover';

export interface NavColorPickerProps extends StyleableProps<NavColorPickerSlot> {
  value?: string;
  /** `undefined` clears the color back to the default styling. */
  onChange: (color: string | undefined) => void;
  /** Accessible label, e.g. the entry/tile title. */
  label: string;
  /** Popover horizontal alignment relative to the swatch (default "right"). */
  align?: 'left' | 'right';
}

/**
 * A swatch button that opens a popover of preset accent colors + a custom color
 * input + a "Default" reset. Self-contained (owns its open state); the host owns
 * `value`/`onChange`. Replaces the apps' hand-copied `ColorPicker` /
 * `HubTileColorPicker`. Tailwind-first; overridable per slot.
 */
export const NavColorPicker = ({
  value,
  onChange,
  label,
  align = 'right',
  classNames,
  unstyled,
}: NavColorPickerProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={resolveClass('relative', classNames?.root, unstyled)}>
      <button
        type="button"
        aria-label={`Set color for ${label}`}
        title="Set color"
        onClick={() => setOpen((o) => !o)}
        className={resolveClass(
          'flex h-6 w-6 items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800',
          classNames?.trigger,
          unstyled,
        )}
      >
        <span
          className={resolveClass(
            'h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600',
            classNames?.dot,
            unstyled,
          )}
          style={value ? { backgroundColor: value, borderColor: value } : undefined}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className={resolveClass('fixed inset-0 z-10', classNames?.backdrop, unstyled)}
            onClick={() => setOpen(false)}
          />
          <div
            className={resolveClass(
              `absolute ${align === 'right' ? 'right-0' : 'left-0'} z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900`,
              classNames?.popover,
              unstyled,
            )}
          >
            <ColorSwatchGrid value={value} onChange={onChange} onCommit={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
};
