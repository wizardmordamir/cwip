import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

type Datum = { label: string; count: number; color?: string };
type Props = {
  data: Datum[];
  height?: number;
  // Color every bar with the accent, or pass per-datum colors via `color`.
  colorByIndex?: boolean;
  valueFormatter?: (n: number) => string;
};

// A compact categorical bar chart — latency histograms, method/status breakdowns.
export const MiniBarChart = ({ data, height = 220, colorByIndex = false, valueFormatter = formatNumber }: Props) => {
  const theme = useChartTheme();
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No data in range
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey="label"
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
          width={40}
        />
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: theme.grid, opacity: 0.4 }}
          content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => valueFormatter(v)} />}
        />
        <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell
              key={d.label}
              fill={d.color ?? (colorByIndex ? theme.palette[i % theme.palette.length] : theme.accent)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
