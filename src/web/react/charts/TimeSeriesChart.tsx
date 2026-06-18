import { useId } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber, formatTimeFull, formatTimeTick } from './format';

export type Series = {
  key: string;
  name: string;
  // Defaults to the next palette color when omitted.
  color?: string;
  // 'area' (gradient fill) or 'line'. Mixed series are fine (ComposedChart).
  kind?: 'area' | 'line';
};

type Props = {
  data: any[];
  series: Series[];
  // x-axis data key (epoch ms). Defaults to 'ts'.
  xKey?: string;
  height?: number;
  // Format a y value for axis ticks + tooltip rows.
  valueFormatter?: (n: number) => string;
  // Whether x ticks should include the date (multi-day ranges).
  includeDate?: boolean;
  // Optional horizontal reference line (e.g. an SLA threshold).
  reference?: { y: number; label?: string; color?: string };
  // Pixel width reserved for the Y-axis labels. Increase for long formatted values (e.g. "$10,000.00").
  yAxisWidth?: number;
};

// The workhorse line/area time-series for the dashboard. Theme-aware, gradient
// area fills, themed tooltip, gap-tolerant. One component drives throughput,
// latency, error-rate, memory, etc. — callers just pass series + a formatter.
export const TimeSeriesChart = ({
  data,
  series,
  xKey = 'ts',
  height = 220,
  valueFormatter = formatNumber,
  includeDate = false,
  reference,
  yAxisWidth = 48,
}: Props) => {
  const theme = useChartTheme();
  const gradId = useId().replace(/:/g, '');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? theme.palette[i % theme.palette.length];
            return (
              <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => formatTimeTick(v, includeDate)}
          stroke={theme.axis}
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={(v) => valueFormatter(v)}
          stroke={theme.axis}
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
        />
        <Tooltip
          isAnimationActive={false}
          content={(p: any) => (
            <ChartTooltip
              {...p}
              theme={theme}
              labelFormatter={(l) => formatTimeFull(Number(l))}
              valueFormatter={(v) => valueFormatter(v)}
            />
          )}
        />
        {reference && (
          <ReferenceLine
            y={reference.y}
            stroke={reference.color ?? theme.status['4xx']}
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
