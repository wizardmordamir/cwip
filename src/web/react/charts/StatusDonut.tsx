import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './chartTheme';
import { formatNumber } from './format';

type Props = {
  // e.g. { '2xx': 1200, '4xx': 30, '5xx': 2 }
  byClass: Record<string, number>;
  height?: number;
};

const ORDER = ['2xx', '3xx', '4xx', '5xx', 'other'];

// A status-class donut with the total in the center — the at-a-glance "is the site
// healthy" widget. Slice colors come from the shared status palette.
export const StatusDonut = ({ byClass, height = 220 }: Props) => {
  const theme = useChartTheme();
  const data = ORDER.filter((k) => (byClass[k] ?? 0) > 0).map((k) => ({
    name: k,
    value: byClass[k] ?? 0,
    color: theme.status[k] ?? theme.status.other,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No requests in range
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            isAnimationActive={false}
            content={(p: any) => <ChartTooltip {...p} theme={theme} valueFormatter={(v) => formatNumber(v)} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {formatNumber(total)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">requests</span>
      </div>
    </div>
  );
};
