import { IconButton } from '../components/IconButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { cx } from '../styling';
import type { UiScaleLevelId } from './scale';
import { useUiScale } from './useUiScale';

export interface UiScaleControlProps {
  /** Show the A− / A+ fine steppers either side of the presets (default true). */
  showStepper?: boolean;
  /** Show the live "115%" readout (default true). */
  showValue?: boolean;
  className?: string;
}

/**
 * An accessibility control for the app-wide UI size: a preset picker
 * (Small…Largest) plus optional A− / A+ fine steppers and a live percentage. Drop
 * it into a Settings/Accessibility panel — it reads & writes the shared
 * {@link useUiScale} store, so the change is immediate, persisted, and global.
 */
export function UiScaleControl({ showStepper = true, showValue = true, className }: UiScaleControlProps) {
  const { scale, level, levels, setLevel, increase, decrease, atMin, atMax } = useUiScale();
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      {showStepper && (
        <IconButton label="Decrease UI size" onClick={decrease} disabled={atMin}>
          <span aria-hidden className="text-sm font-semibold">
            A−
          </span>
        </IconButton>
      )}
      <SegmentedControl
        options={levels.map((l) => ({ value: l.id, label: l.label }))}
        value={level.id}
        onChange={(id) => setLevel(id as UiScaleLevelId)}
      />
      {showStepper && (
        <IconButton label="Increase UI size" onClick={increase} disabled={atMax}>
          <span aria-hidden className="text-base font-semibold">
            A+
          </span>
        </IconButton>
      )}
      {showValue && (
        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{Math.round(scale * 100)}%</span>
      )}
    </div>
  );
}
