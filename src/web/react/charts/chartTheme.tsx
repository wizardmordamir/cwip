import { createContext, type ReactNode, useContext } from 'react';

// A single source of truth for chart colors so every graph matches the host app's
// theme and stays legible in light and dark. Recharts wants concrete hex values, so
// these are resolved as hex (not CSS variables it can't read). The host app injects
// its own theme via <ChartThemeProvider>; with no provider the charts fall back to
// the built-in DARK_THEME (so they render standalone — better DX than throwing).
export type ChartTheme = {
  isDark: boolean;
  accent: string;
  grid: string;
  axis: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  // A distinct, ordered palette for multi-series charts.
  palette: string[];
  // Conventional status-class colors (2xx ok, 4xx warn, 5xx error, …).
  status: Record<string, string>;
};

// Status + series colors read well on both themes, so they're shared across presets.
const STATUS: Record<string, string> = {
  '2xx': '#10b981',
  '3xx': '#0ea5e9',
  '4xx': '#f59e0b',
  '5xx': '#f43f5e',
  other: '#94a3b8',
};

const palette = (accent: string): string[] => [
  accent,
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#14b8a6',
  '#6366f1',
  '#ec4899',
];

// Light/dark presets — the exact palettes ca's useChartTheme resolved off its theme
// slice. Export them so apps can use them verbatim or as a base to tweak.
export const LIGHT_THEME: ChartTheme = {
  isDark: false,
  accent: '#059669',
  grid: '#e5e7eb',
  axis: '#9ca3af',
  text: '#374151',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  palette: palette('#059669'),
  status: STATUS,
};

export const DARK_THEME: ChartTheme = {
  isDark: true,
  accent: '#34d399',
  grid: '#1f2937',
  axis: '#4b5563',
  text: '#d1d5db',
  tooltipBg: '#0b1220',
  tooltipBorder: '#374151',
  palette: palette('#34d399'),
  status: STATUS,
};

// Convenience builder: pick the light/dark preset for a boolean.
export const chartThemeFor = (isDark: boolean): ChartTheme => (isDark ? DARK_THEME : LIGHT_THEME);

const ChartThemeContext = createContext<ChartTheme | null>(null);

// Provide a chart theme to the subtree. Host apps build a ChartTheme from their own
// theme state (e.g. `chartThemeFor(isDark)` or a fully custom object) and wrap the
// dashboard once.
export const ChartThemeProvider = ({ theme, children }: { theme: ChartTheme; children: ReactNode }) => (
  <ChartThemeContext.Provider value={theme}>{children}</ChartThemeContext.Provider>
);

// Read the active chart theme. Falls back to DARK_THEME when no provider is present
// so charts render standalone (does NOT throw — deliberate for DX).
export const useChartTheme = (): ChartTheme => useContext(ChartThemeContext) ?? DARK_THEME;
