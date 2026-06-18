import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

export type BarDatum = { label: string; value: number; color?: string };

type Props = {
  data: BarDatum[];
  height?: number;
  // Color positive bars emerald and negative bars rose (cash-flow style). When a
  // datum supplies its own `color` that always wins.
  diverging?: boolean;
  // Color each bar from the palette by index (when not diverging / no per-datum color).
  colorByIndex?: boolean;
  valueFormatter?: (n: number) => string;
  emptyHint?: string;
  // Pixel width reserved for the Y-axis labels. Increase for long formatted values (e.g. "$10,000.00").
  yAxisWidth?: number;
};

// A categorical bar chart that handles signed values: a zero baseline is drawn and
// negative bars hang below it. Used for percent-change momentum and monthly net
// cash flow (green up / red down).
export const CategoryBars = ({
  data,
  height = 220,
  diverging = false,
  colorByIndex = false,
  valueFormatter = formatNumber,
  emptyHint = 'No data',
  yAxisWidth = 48,
}: Props) => {
  const theme = useChartTheme();
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        {emptyHint}
      </div>
    );
  }
  const hasNegative = data.some((d) => d.value < 0);
  const up = theme.status['2xx'];
  const down = theme.status['5xx'];
  const colorFor = (d: BarDatum, i: number): string => {
    if (d.color) return d.color;
    if (diverging) return d.value < 0 ? down : up;
    if (colorByIndex) return theme.palette[i % theme.palette.length];
    return theme.accent;
  };

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
          width={yAxisWidth}
        />
        {hasNegative && <ReferenceLine y={0} stroke={theme.axis} />}
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: theme.grid, opacity: 0.4 }}
          content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => valueFormatter(v)} />}
        />
        <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={colorFor(d, i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
