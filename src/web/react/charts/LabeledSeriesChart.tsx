import { useId } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

export type LabeledSeries = {
  key: string;
  name: string;
  color?: string;
  kind?: 'area' | 'line';
  // Areas sharing a stackId stack together (positive above 0, negative below).
  stackId?: string;
};

type Props = {
  data: any[];
  series: LabeledSeries[];
  // x-axis data key — a plain label string (e.g. "Jun 26"). Defaults to 'label'.
  xKey?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
  // Header label for the tooltip (the hovered row's x value). Defaults to identity.
  labelFormatter?: (label: string | number) => string;
  reference?: { y: number; label?: string; color?: string };
  showLegend?: boolean;
  emptyHint?: string;
};

// A multi-series chart over a categorical/label x-axis (dates already formatted to
// strings, spend levels, etc.) — the finance counterpart to the dashboard's
// epoch-ms TimeSeriesChart. Mixes stacked areas and lines via ComposedChart.
export const LabeledSeriesChart = ({
  data,
  series,
  xKey = 'label',
  height = 240,
  valueFormatter = formatNumber,
  labelFormatter,
  reference,
  showLegend = false,
  emptyHint = 'Not enough data to chart yet.',
}: Props) => {
  const theme = useChartTheme();
  const gradId = useId().replace(/:/g, '');

  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyHint}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? theme.palette[i % theme.palette.length];
            return (
              <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={theme.axis}
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
          minTickGap={24}
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
          content={(p: any) => (
            <ChartTooltip
              {...p}
              theme={theme}
              labelFormatter={labelFormatter}
              valueFormatter={(v) => valueFormatter(v)}
            />
          )}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.axis }} iconType="plainline" />}
        {reference && (
          <ReferenceLine
            y={reference.y}
            stroke={reference.color ?? theme.axis}
            strokeDasharray="4 4"
            label={
              reference.label
                ? { value: reference.label, fill: theme.axis, fontSize: 10, position: 'right' }
                : undefined
            }
          />
        )}
        {series.map((s, i) => {
          const color = s.color ?? theme.palette[i % theme.palette.length];
          if (s.kind === 'line') {
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            );
          }
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stackId={s.stackId}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId}-${s.key})`}
              isAnimationActive={false}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
