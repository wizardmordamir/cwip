import type { ReactNode } from 'react';
import { Sparkline } from './Sparkline';

type Progress = {
  // Numerator + denominator of an "X of Y" ratio (e.g. clean repos / all repos).
  value: number;
  max: number;
  // Tailwind `bg-*` class for the filled portion (default the accent token).
  barClassName?: string;
  // Trailing caption after the computed percent, e.g. "of repos" → "42% of repos".
  label?: string;
};

type Props = {
  label: string;
  value: ReactNode;
  // Optional small caption under the value (e.g. "p95 1.2s").
  sub?: ReactNode;
  // Optional recent-trend sparkline.
  spark?: number[];
  // Optional "X of Y" percent bar (mutually useful with sparkline; renders below).
  progress?: Progress;
  // Accent color for the value + sparkline (status-aware callers pass a hue).
  color?: string;
  icon?: ReactNode;
};

// A big-number KPI tile — throughput, error rate, p95, total — with an optional
// trend sparkline and/or an "X of Y" percent bar. Pure layout; charts come from
// Sparkline.
export const StatTile = ({ label, value, sub, spark, progress, color, icon }: Props) => {
  const pct = progress && progress.max > 0 ? Math.round((progress.value / progress.max) * 100) : null;
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      </div>
      <div className="text-3xl font-semibold tabular-nums leading-none" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
      {pct !== null && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full ${progress?.barClassName ?? 'bg-accent'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {progress?.label && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {pct}% {progress.label}
            </span>
          )}
        </div>
      )}
      {spark && spark.length > 1 && (
        <div className="-mb-1">
          <Sparkline data={spark} color={color} height={32} />
        </div>
      )}
    </div>
  );
};
