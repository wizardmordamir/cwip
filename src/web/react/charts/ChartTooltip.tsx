import type { ChartTheme } from './chartTheme';

type TooltipEntry = { name?: string; value?: number; color?: string; dataKey?: string };
type Props = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  theme: ChartTheme;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number, entry: TooltipEntry) => string;
};

// A theme-aware replacement for recharts' default tooltip so it matches the app's
// surfaces in light/dark. Pass it to a recharts <Tooltip content={...}> via a thin
// closure that injects `theme` and the formatters.
export const ChartTooltip = ({ active, payload, label, theme, labelFormatter, valueFormatter }: Props) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.text,
      }}
    >
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: theme.text }}>
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? entry.name ?? i}`} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="opacity-70">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {valueFormatter ? valueFormatter(entry.value ?? 0, entry) : (entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
