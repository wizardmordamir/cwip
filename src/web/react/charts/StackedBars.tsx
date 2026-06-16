import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

export type StackSeries = { key: string; name: string; color?: string };

type Props = {
  data: any[];
  series: StackSeries[];
  xKey?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
  // Stack the series (default) or render them grouped side by side.
  stacked?: boolean;
  showLegend?: boolean;
  emptyHint?: string;
};

// A grouped/stacked categorical bar chart (e.g. premium + care cost per plan). The
// per-category breakdown the single-value CategoryBars can't express.
export const StackedBars = ({
  data,
  series,
  xKey = 'label',
  height = 240,
  valueFormatter = formatNumber,
  stacked = true,
  showLegend = true,
  emptyHint = 'No data',
}: Props) => {
  const theme = useChartTheme();
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        {emptyHint}
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={theme.axis}
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
          interval={0}
          angle={data.length > 6 ? -25 : 0}
          textAnchor={data.length > 6 ? 'end' : 'middle'}
          height={data.length > 6 ? 48 : 24}
        />
        <YAxis
          tickFormatter={(v) => valueFormatter(v)}
          stroke={theme.axis}
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: theme.grid, opacity: 0.4 }}
          content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => valueFormatter(v)} />}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.axis }} iconType="square" />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? 'a' : undefined}
            fill={s.color ?? theme.palette[i % theme.palette.length]}
            radius={stacked && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
