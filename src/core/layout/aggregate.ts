import type { LayoutRow } from './field';
import type { AggregateMetric } from './types';

// Pull a finite numeric value out of a cell, or null if it's empty/non-numeric.
const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isTrue = (v: unknown): boolean => v === true || v === 1 || v === 'true' || v === '1';

const notEmpty = (v: unknown): boolean =>
  v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);

// Compute a list-level metric over the visible rows. Used by aggregate-bound
// widgets (KPIs, progress, donuts) on the dashboard surface — computed client-side
// over the already-loaded (and, in card mode, filtered) row set.
export const computeAggregate = (
  metric: AggregateMetric,
  key: string | undefined,
  rows: LayoutRow[],
): number | null => {
  if (metric === 'count') return rows.length;

  if (metric === 'countTrue') return key ? rows.filter((r) => isTrue(r[key])).length : null;

  if (metric === 'progress') {
    if (!key || rows.length === 0) return rows.length === 0 ? 0 : null;
    return rows.filter((r) => isTrue(r[key])).length / rows.length;
  }

  if (metric === 'distinctCount') {
    if (!key) return null;
    const seen = new Set<string>();
    for (const r of rows) {
      const v = r[key];
      if (Array.isArray(v)) {
        for (const x of v) if (notEmpty(x)) seen.add(String(x));
      } else if (notEmpty(v)) {
        seen.add(String(v));
      }
    }
    return seen.size;
  }

  // sum / avg / min / max over a numeric column
  if (!key) return null;
  const nums = rows.map((r) => num(r[key])).filter((n): n is number => n !== null);
  if (nums.length === 0) return metric === 'sum' ? 0 : null;
  if (metric === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (metric === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (metric === 'min') return Math.min(...nums);
  if (metric === 'max') return Math.max(...nums);
  return null;
};

// Count rows per distinct value of a column (array values counted per member),
// most-common first — drives the dashboard "breakdown" widget.
export const computeDistribution = (key: string, rows: LayoutRow[]): { label: string; value: number }[] => {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = r[key];
    const vals = Array.isArray(raw) ? raw : [raw];
    for (const x of vals) {
      const label = x === '' || x === null || x === undefined ? '—' : String(x);
      if (!counts.has(label)) {
        counts.set(label, 0);
        order.push(label);
      }
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return order.map((label) => ({ label, value: counts.get(label) ?? 0 })).sort((a, b) => b.value - a.value);
};
