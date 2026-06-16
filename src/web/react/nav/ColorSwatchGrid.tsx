import { resolveClass, type StyleableProps } from '../styling';
import { NAV_COLORS } from './colors';

export type ColorSwatchGridSlot = 'root' | 'swatch' | 'footer' | 'custom' | 'reset';

export interface ColorSwatchGridProps extends StyleableProps<ColorSwatchGridSlot> {
  value?: string;
  /** Live value changes (incl. dragging the custom picker). `undefined` = clear. */
  onChange: (color: string | undefined) => void;
  /** Fired after a discrete pick (a swatch or "Default") — lets a wrapper close. */
  onCommit?: () => void;
  /** Text for the clear-to-default action (default "Default"). */
  resetLabel?: string;
}

const SWATCH = 'h-8 w-full rounded-md transition hover:scale-105';
const SWATCH_ON = 'ring-2 ring-gray-900 ring-offset-1 dark:ring-white dark:ring-offset-gray-900';

/**
 * The palette grid (presets + a custom `<input type=color>` + a reset) shared by
 * {@link NavColorPicker} (swatch button → popover) and the nav kebab menu
 * (inline). Presentational + controlled; the popover/positioning lives in the
 * wrappers. Swatches/reset call `onChange` then `onCommit`; the custom input only
 * calls `onChange` so the wrapper stays open while you drag the picker.
 */
export const ColorSwatchGrid = ({
  value,
  onChange,
  onCommit,
  resetLabel = 'Default',
  classNames,
  unstyled,
}: ColorSwatchGridProps) => {
  const pick = (color: string | undefined) => {
    onChange(color);
    onCommit?.();
  };
  return (
    <div className={resolveClass('', classNames?.root, unstyled)}>
      <div className="grid grid-cols-4 gap-2">
        {NAV_COLORS.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={color}
            onClick={() => pick(color)}
            style={{ backgroundColor: color }}
            className={resolveClass(
              `${SWATCH} ${value?.toLowerCase() === color ? SWATCH_ON : ''}`,
              classNames?.swatch,
              unstyled,
            )}
          />
        ))}
      </div>
      <div className={resolveClass('mt-3 flex items-center justify-between gap-2', classNames?.footer, unstyled)}>
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="color"
            value={value ?? '#10b981'}
            onChange={(e) => onChange(e.target.value)}
            className={resolveClass(
              'h-7 w-9 cursor-pointer rounded border border-gray-300 dark:border-gray-700',
              classNames?.custom,
              unstyled,
            )}
          />
          Custom
        </label>
        <button
          type="button"
          onClick={() => pick(undefined)}
          className={resolveClass(
            'rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
            classNames?.reset,
            unstyled,
          )}
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
};
