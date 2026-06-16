// cwip/react charts — theme-aware recharts dashboard components (peer deps: react,
// recharts). One source of truth for the metric/finance/admin charts shared across
// apps. Theming is INJECTED via <ChartThemeProvider> (so cwip stays app-agnostic);
// with no provider, charts fall back to the built-in DARK_THEME (they never throw).
//
// Wire-up in a host app: build a ChartTheme from your theme state and wrap the
// dashboard once —
//   import { ChartThemeProvider, chartThemeFor } from 'cwip/react';
//   <ChartThemeProvider theme={chartThemeFor(isDark)}>…charts…</ChartThemeProvider>
// or pass LIGHT_THEME / DARK_THEME / a fully custom ChartTheme object directly.
//
// Tailwind: the components are Tailwind-first with `dark:` classes, so register
// cwip's dist as a Tailwind source (the same `@import "cwip/styles.css"` the rest of
// cwip/react needs).

export * from './CategoryBars';
export * from './CategoryDonut';
export * from './ChartTooltip';
export * from './chartTheme';
export * from './DataTable';
export * from './DivergingBars';
export * from './DonutChart';
export * from './format';
export * from './LabeledSeriesChart';
export * from './MiniBarChart';
export * from './Sparkline';
export * from './StackedBars';
export * from './StatTile';
export * from './StatusDonut';
export * from './TimeSeriesChart';
