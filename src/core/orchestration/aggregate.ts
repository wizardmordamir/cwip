import { quantile } from './quantile';
import { type CategoryKey, type GroupKey, groupOf, labelForCategory } from './taxonomy';
import type { TimingEvent } from './types';

// Per-category rollup of durations across a set of timing events.
export type CategoryStat = {
  category: CategoryKey;
  group: GroupKey;
  label: string;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  // Arithmetic mean.
  avgMs: number;
  medianMs: number;
  // 95th percentile (linear-interpolated).
  p95Ms: number;
};

export type AggregateOptions = {
  // Exclude kind:'task' summary rows (per-task wall-clock totals, NOT work) from
  // per-category stats. Default true — they'd otherwise inflate 'task-admin'.
  excludeTaskRows?: boolean;
};

// One CategoryStat per category that appears in `events`, sorted by totalMs desc.
// By default the kind:'task' summary rows are excluded (they're task totals, not
// work in a category). Set excludeTaskRows:false to include them.
export const aggregateByCategory = (events: TimingEvent[], opts: AggregateOptions = {}): CategoryStat[] => {
  const excludeTaskRows = opts.excludeTaskRows ?? true;
  const buckets = new Map<CategoryKey, number[]>();

  for (const ev of events) {
    if (excludeTaskRows && ev.kind === 'task') continue;
    const arr = buckets.get(ev.category);
    if (arr) arr.push(ev.duration_ms);
    else buckets.set(ev.category, [ev.duration_ms]);
  }

  const stats: CategoryStat[] = [];
  for (const [category, durations] of buckets) {
    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const totalMs = sorted.reduce((s, d) => s + d, 0);
    stats.push({
      category,
      group: groupOf(category),
      label: labelForCategory(category),
      count,
      totalMs,
      minMs: sorted[0],
      maxMs: sorted[count - 1],
      avgMs: count ? Math.round(totalMs / count) : 0,
      medianMs: Math.round(quantile(sorted, 0.5)),
      p95Ms: Math.round(quantile(sorted, 0.95)),
    });
  }

  return stats.sort((a, b) => b.totalMs - a.totalMs);
};

export type GroupRollup = { group: GroupKey; totalMs: number; count: number };

export type TimingSummary = {
  // Distinct task count: distinct session ids that have a kind:'task' summary row;
  // falls back to distinct session ids overall when no task rows are present.
  taskCount: number;
  eventCount: number;
  totalMs: number;
  byGroup: GroupRollup[];
  firstTs: number | null;
  lastTs: number | null;
};

// High-level summary across a set of events: task/event counts, total duration,
// per-group rollups (sorted by totalMs desc), and the time span. Group totals
// exclude kind:'task' rows so they reflect real work, not per-task wall-clock.
export const summarize = (events: TimingEvent[]): TimingSummary => {
  const taskSessions = new Set<string>();
  const allSessions = new Set<string>();
  const groupTotals = new Map<GroupKey, { totalMs: number; count: number }>();
  let totalMs = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;

  for (const ev of events) {
    if (ev.session) allSessions.add(ev.session);
    if (ev.kind === 'task') {
      if (ev.session) taskSessions.add(ev.session);
      continue; // task rows are per-task totals — keep them out of work rollups
    }
    totalMs += ev.duration_ms;
    const g = groupTotals.get(ev.group);
    if (g) {
      g.totalMs += ev.duration_ms;
      g.count += 1;
    } else {
      groupTotals.set(ev.group, { totalMs: ev.duration_ms, count: 1 });
    }
    if (ev.ts) {
      if (firstTs === null || ev.ts < firstTs) firstTs = ev.ts;
      if (lastTs === null || ev.ts > lastTs) lastTs = ev.ts;
    }
  }

  const byGroup: GroupRollup[] = [...groupTotals.entries()]
    .map(([group, v]) => ({ group, totalMs: v.totalMs, count: v.count }))
    .sort((a, b) => b.totalMs - a.totalMs);

  return {
    taskCount: taskSessions.size > 0 ? taskSessions.size : allSessions.size,
    eventCount: events.length,
    totalMs,
    byGroup,
    firstTs,
    lastTs,
  };
};
