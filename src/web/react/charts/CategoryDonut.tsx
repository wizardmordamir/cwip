import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

export type DonutSlice = { name: string; value: number; color?: string };

type Props = {
  data: DonutSlice[];
  height?: number;
  // Big number rendered in the hole (defaults to the formatted total).
  centerValue?: string;
  // Caption under the center value (e.g. "per month").
  centerLabel?: string;
  valueFormatter?: (n: number) => string;
  emptyHint?: string;
};

// A generic donut for category breakdowns (spending by kind, balances by bucket).
// Slices fall back to the theme palette; the hole shows a total or a caller value.
export const CategoryDonut = ({
  data,
  height = 220,
  centerValue,
  centerLabel,
  valueFormatter = formatNumber,
  emptyHint = 'No data',
}: Props) => {
  const theme = useChartTheme();
  const slices = data.filter((d) => Math.abs(d.value) > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? theme.palette[i % theme.palette.length]} />
            ))}
          </Pie>
          <Tooltip
            isAnimationActive={false}
            content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => valueFormatter(v)} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {centerValue ?? valueFormatter(total)}
        </span>
        {centerLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>}
      </div>
    </div>
  );
};
