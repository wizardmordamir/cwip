import { groupOf, isCategoryKey } from './taxonomy';
import type { TimingEvent, TimingEventKind } from './types';

const KINDS = new Set<TimingEventKind>(['phase', 'run', 'mark', 'task']);

const toNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toStr = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v));

// Coerce one parsed JSON object into a TimingEvent, normalizing category (unknown →
// 'other'), group (always derived from the coerced category), kind, numbers, and
// booleans. Tolerant: missing fields get sensible defaults. Returns null only when
// the input isn't an object at all.
const coerceEvent = (raw: unknown): TimingEvent | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const category = isCategoryKey(toStr(o.category)) ? (o.category as TimingEvent['category']) : 'other';
  const kindRaw = toStr(o.kind) as TimingEventKind;
  const kind: TimingEventKind = KINDS.has(kindRaw) ? kindRaw : 'mark';

  const exitRaw = o.exit_code;
  const exit_code = exitRaw == null ? undefined : toNumber(exitRaw);
  // Prefer an explicit ok; otherwise derive from exit_code like orchlog does.
  const ok = typeof o.ok === 'boolean' ? o.ok : exit_code == null ? true : exit_code === 0;

  return {
    schema: toStr(o.schema),
    event_id: toStr(o.event_id),
    session: toStr(o.session),
    worker: toStr(o.worker),
    task_id: toStr(o.task_id),
    task_title: toStr(o.task_title),
    repo: toStr(o.repo, 'unknown'),
    category,
    group: groupOf(category),
    kind,
    command: o.command == null ? undefined : toStr(o.command),
    exit_code,
    ok,
    note: o.note == null ? undefined : toStr(o.note),
    start: toStr(o.start),
    end: toStr(o.end),
    duration_ms: Math.max(0, Math.round(toNumber(o.duration_ms))),
    ts: Math.round(toNumber(o.ts)),
  };
};

// Parse JSONL (one JSON object per line) emitted by orchlog into TimingEvents.
// TOLERANT — never throws: blank lines, `#`/`//` comment lines, and malformed JSON
// are skipped; unknown categories are coerced to 'other'; numbers are coerced.
export const parseTimingJsonl = (text: string): TimingEvent[] => {
  if (!text) return [];
  const out: TimingEvent[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue; // skip malformed lines
    }
    const ev = coerceEvent(parsed);
    if (ev) out.push(ev);
  }
  return out;
};
