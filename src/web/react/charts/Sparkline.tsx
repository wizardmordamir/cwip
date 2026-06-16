import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useChartTheme } from './chartTheme';

type Props = {
  data: number[];
  color?: string;
  height?: number;
};

// A tiny, axis-less gradient sparkline for stat tiles — shows the recent shape of a
// metric without chrome. Defaults to the theme accent.
export const Sparkline = ({ data, color, height = 36 }: Props) => {
  const theme = useChartTheme();
  const stroke = color ?? theme.accent;
  const gradId = useId().replace(/:/g, '');
  const series = data.map((v, i) => ({ i, v }));
  if (series.length < 2) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
