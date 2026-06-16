import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

type Props = {
  data: { label: string; value: number }[];
  height?: number;
};

// A generic category donut with the total in the center — slice colors from the
// shared multi-series palette. Used by the layout engine's "donut" widget.
export const DonutChart = ({ data, height = 160 }: Props) => {
  const theme = useChartTheme();
  const items = data.filter((d) => d.value > 0).slice(0, 8);
  const total = items.reduce((s, d) => s + d.value, 0);
  if (items.length === 0) return <span className="text-sm text-gray-400">—</span>;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={items}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="none"
          >
            {items.map((d, i) => (
              <Cell key={d.label} fill={theme.palette[i % theme.palette.length]} />
            ))}
          </Pie>
          <Tooltip
            content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => formatNumber(v)} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatNumber(total)}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">total</span>
      </div>
    </div>
  );
};
