import { describe, expect, it } from 'bun:test';
import { aggregateByCategory, summarize } from './aggregate';
import { parseTimingJsonl } from './parse';
import type { TimingEvent } from './types';

// Minimal event builder for aggregation math (only the fields the rollups read).
let seq = 0;
const ev = (over: Partial<TimingEvent> & { category: TimingEvent['category'] }): TimingEvent => {
  seq += 1;
  return {
    schema: 'orchlog/v1',
    event_id: `S:${seq}`,
    session: 'S',
    worker: 'W1',
    task_id: 'slug',
    task_title: 'Title',
    repo: 'cursedalchemy',
    group: 'verify',
    kind: 'run',
    ok: true,
    start: '2026-06-15T00:00:00.000Z',
    end: '2026-06-15T00:00:00.000Z',
    duration_ms: 0,
    ts: 1718000000000 + seq,
    ...over,
  } as TimingEvent;
};

describe('aggregateByCategory', () => {
  it('computes min/max/mean/median/p95 on a known fixture', () => {
    // typecheck durations: [10,20,30,40,50] (ms scaled up for realism below)
    const durations = [100, 200, 300, 400, 500];
    const events = durations.map((d) => ev({ category: 'typecheck', duration_ms: d }));
    const [stat] = aggregateByCategory(events);
    expect(stat.category).toBe('typecheck');
    expect(stat.group).toBe('verify');
    expect(stat.label).toBe('Typecheck');
    expect(stat.count).toBe(5);
    expect(stat.totalMs).toBe(1500);
    expect(stat.minMs).toBe(100);
    expect(stat.maxMs).toBe(500);
    expect(stat.avgMs).toBe(300);
    expect(stat.medianMs).toBe(300);
    // p95: pos = 0.95*4 = 3.8 → 400 + 0.8*100 = 480
    expect(stat.p95Ms).toBe(480);
  });

  it('produces one row per category, sorted by totalMs desc', () => {
    const events = [
      ev({ category: 'lint', duration_ms: 50 }),
      ev({ category: 'build', duration_ms: 500 }),
      ev({ category: 'build', duration_ms: 500 }),
      ev({ category: 'typecheck', duration_ms: 200 }),
    ];
    const stats = aggregateByCategory(events);
    expect(stats.map((s) => s.category)).toEqual(['build', 'typecheck', 'lint']);
    expect(stats[0].totalMs).toBe(1000);
  });

  it('excludes kind:"task" summary rows by default, includes them when asked', () => {
    const events = [
      ev({ category: 'task-admin', kind: 'task', duration_ms: 60000 }),
      ev({ category: 'typecheck', kind: 'run', duration_ms: 1000 }),
    ];
    const defaultStats = aggregateByCategory(events);
    expect(defaultStats.map((s) => s.category)).toEqual(['typecheck']);

    const withTasks = aggregateByCategory(events, { excludeTaskRows: false });
    expect(withTasks.map((s) => s.category).sort()).toEqual(['task-admin', 'typecheck']);
    const taskStat = withTasks.find((s) => s.category === 'task-admin');
    expect(taskStat?.totalMs).toBe(60000);
  });

  it('returns [] for no events', () => {
    expect(aggregateByCategory([])).toEqual([]);
  });
});

describe('summarize', () => {
  it('counts distinct task sessions, events, total, group rollups, and span', () => {
    const events: TimingEvent[] = [
      ev({ category: 'planning', group: 'cognitive', kind: 'phase', duration_ms: 300, ts: 100, session: 'A' }),
      ev({ category: 'typecheck', group: 'verify', kind: 'run', duration_ms: 700, ts: 200, session: 'A' }),
      ev({ category: 'task-admin', group: 'meta', kind: 'task', duration_ms: 9999, ts: 300, session: 'A' }),
      ev({ category: 'build', group: 'verify', kind: 'run', duration_ms: 500, ts: 400, session: 'B' }),
      ev({ category: 'task-admin', group: 'meta', kind: 'task', duration_ms: 9999, ts: 500, session: 'B' }),
    ];
    const s = summarize(events);
    expect(s.taskCount).toBe(2); // sessions A and B each have a task row
    expect(s.eventCount).toBe(5);
    // total excludes the two task rows: 300 + 700 + 500
    expect(s.totalMs).toBe(1500);
    // verify (700 + 500) before cognitive (300); meta excluded (only task rows)
    expect(s.byGroup).toEqual([
      { group: 'verify', totalMs: 1200, count: 2 },
      { group: 'cognitive', totalMs: 300, count: 1 },
    ]);
    expect(s.firstTs).toBe(100);
    expect(s.lastTs).toBe(400); // task-row ts (300/500) excluded from span
  });

  it('falls back to distinct session ids when there are no task rows', () => {
    const events = [
      ev({ category: 'typecheck', kind: 'run', session: 'X', duration_ms: 1 }),
      ev({ category: 'lint', kind: 'run', session: 'Y', duration_ms: 1 }),
      ev({ category: 'lint', kind: 'run', session: 'Y', duration_ms: 1 }),
    ];
    expect(summarize(events).taskCount).toBe(2);
  });

  it('handles empty input', () => {
    const s = summarize([]);
    expect(s).toEqual({
      taskCount: 0,
      eventCount: 0,
      totalMs: 0,
      byGroup: [],
      firstTs: null,
      lastTs: null,
    });
  });
});

describe('end-to-end parse + aggregate', () => {
  it('parses orchlog-shaped JSONL then aggregates it', () => {
    const jsonl = [
      '{"schema":"orchlog/v1","session":"W1-1","category":"typecheck","group":"verify","kind":"run","duration_ms":1200,"ts":1,"ok":true}',
      '{"schema":"orchlog/v1","session":"W1-1","category":"lint","group":"verify","kind":"run","duration_ms":300,"ts":2,"ok":true}',
      '{"schema":"orchlog/v1","session":"W1-1","category":"task-admin","group":"meta","kind":"task","duration_ms":99999,"ts":3,"ok":true}',
    ].join('\n');
    const events = parseTimingJsonl(jsonl);
    const stats = aggregateByCategory(events);
    expect(stats.map((s) => s.category)).toEqual(['typecheck', 'lint']);
    expect(summarize(events).taskCount).toBe(1);
  });
});
