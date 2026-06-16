import { cx } from '../styling';

export type DivergingDatum = {
  // Row label (shown right-aligned at the start of the row).
  label: string;
  // Magnitude growing LEFT from the center axis (rendered rose, captioned "-N").
  left: number;
  // Magnitude growing RIGHT from the center axis (rendered emerald, captioned "+N").
  right: number;
};

type Props = {
  data: DivergingDatum[];
  // Legend words shown top-right as "<leftLabel> ← | → <rightLabel>" (both optional).
  leftLabel?: string;
  rightLabel?: string;
  // Tailwind width of the row-label column (default `w-32`).
  labelClassName?: string;
  // Format the numeric caption magnitude (the +/- sign is added by the component).
  valueFormatter?: (n: number) => string;
  emptyHint?: string;
};

// A horizontal diverging ("tornado") bar list: each row's `left` magnitude grows
// leftward from a center axis (rose) and `right` grows rightward (emerald), both
// scaled to the largest single magnitude so the longest bar fills its half. Used
// for two-sided comparisons — commits behind/ahead of a branch, over/under budget,
// loss/gain. Pure layout (no recharts); wrap it in your own card + title.
export const DivergingBars = ({
  data,
  leftLabel,
  rightLabel,
  labelClassName = 'w-32',
  valueFormatter = String,
  emptyHint = 'No data',
}: Props) => {
  if (!data.length) return <div className="text-sm text-gray-400">{emptyHint}</div>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.left, d.right)));
  return (
    <div className="flex flex-col gap-2">
      {(leftLabel || rightLabel) && (
        <div className="flex justify-end text-xs text-gray-400">
          {leftLabel && <span className="text-rose-500">{leftLabel}</span>} ← | →{' '}
          {rightLabel && <span className="text-emerald-500">{rightLabel}</span>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className={cx('shrink-0 truncate text-right text-gray-600 dark:text-gray-300', labelClassName)}
              title={d.label}
            >
              {d.label}
            </span>
            <div className="flex flex-1 items-center">
              <div className="flex flex-1 justify-end">
                {d.left > 0 && (
                  <div className="h-3 rounded-l bg-rose-500/80" style={{ width: `${(d.left / max) * 100}%` }} />
                )}
              </div>
              <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex flex-1 justify-start">
                {d.right > 0 && (
                  <div className="h-3 rounded-r bg-emerald-500/80" style={{ width: `${(d.right / max) * 100}%` }} />
                )}
              </div>
            </div>
            <span className="w-20 shrink-0 tabular-nums text-gray-400">
              {d.left > 0 && <span className="text-rose-500">-{valueFormatter(d.left)}</span>}
              {d.left > 0 && d.right > 0 && ' '}
              {d.right > 0 && <span className="text-emerald-500">+{valueFormatter(d.right)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
