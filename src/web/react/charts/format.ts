// Shared formatters for the metrics charts. Kept dependency-free and locale-light
// so axis ticks and tooltips read consistently across every widget.

export const formatNumber = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
};

export const formatBytes = (n: number): string => {
  if (!n || !Number.isFinite(n)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};

export const formatMs = (n: number): string => {
  if (!Number.isFinite(n)) return '0 ms';
  if (n >= 1000) return `${(n / 1000).toFixed(2)} s`;
  if (n >= 100) return `${Math.round(n)} ms`;
  return `${Math.round(n * 10) / 10} ms`;
};

// 0–1 fraction → percentage string.
export const formatPct = (frac: number, digits = 1): string => `${(frac * 100).toFixed(digits)}%`;

// A signed percentage already expressed in percent units (e.g. 3.14 → "+3.1%").
export const formatSignedPct = (pct: number, digits = 1): string =>
  `${pct >= 0 ? '+' : ''}${(Number.isFinite(pct) ? pct : 0).toFixed(digits)}%`;

const usd = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

// Full dollar amount for tooltips/labels. `cents` keeps two decimals.
export const formatUsd = (n: number, cents = false): string =>
  (cents ? usdCents : usd).format(Number.isFinite(n) ? n : 0);

// Compact dollars for axis ticks: $1.2k, -$3.4M, $980. Sign-aware.
export const formatUsdCompact = (n: number): string => {
  if (!Number.isFinite(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
};

export const formatRps = (n: number): string => (n >= 100 ? `${Math.round(n)}/s` : `${Math.round(n * 100) / 100}/s`);

// Compact clock label for an x-axis tick. For multi-day ranges include the date.
export const formatTimeTick = (ts: number, includeDate = false): string => {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!includeDate) return time;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
};

// Full timestamp for a tooltip header.
export const formatTimeFull = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const formatUptime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  return parts.join(' ') || `${Math.floor(seconds)}s`;
};
