import { describe, expect, it } from 'bun:test';
import { parseTimingJsonl } from './parse';

// A line in the exact shape orchlog emits.
const line = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    schema: 'orchlog/v1',
    event_id: 'W1-1:0001',
    session: 'W1-1',
    worker: 'W1',
    task_id: 'slug',
    task_title: 'Title',
    repo: 'cursedalchemy',
    category: 'typecheck',
    group: 'verify',
    kind: 'run',
    command: 'bun run tsc',
    exit_code: 0,
    ok: true,
    start: '2026-06-15T00:00:00.000Z',
    end: '2026-06-15T00:00:01.000Z',
    duration_ms: 1000,
    ts: 1718000001000,
    ...over,
  });

describe('parseTimingJsonl', () => {
  it('parses a well-formed line into a typed event', () => {
    const [ev] = parseTimingJsonl(line());
    expect(ev.category).toBe('typecheck');
    expect(ev.group).toBe('verify');
    expect(ev.kind).toBe('run');
    expect(ev.duration_ms).toBe(1000);
    expect(ev.ok).toBe(true);
  });

  it('returns [] for empty / falsy input', () => {
    expect(parseTimingJsonl('')).toEqual([]);
    expect(parseTimingJsonl('\n\n')).toEqual([]);
  });

  it('skips blank, comment, and malformed lines without throwing', () => {
    const text = [
      '',
      '   ',
      '# a comment',
      '// another comment',
      '{not json',
      '"just a string"', // valid JSON but not an object → skipped
      'null', // valid JSON, not an object → skipped
      line(),
    ].join('\n');
    const events = parseTimingJsonl(text);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('typecheck');
  });

  it('coerces an unknown category to "other" and re-derives the group', () => {
    const [ev] = parseTimingJsonl(line({ category: 'frobnicate', group: 'verify' }));
    expect(ev.category).toBe('other');
    expect(ev.group).toBe('meta'); // re-derived, ignoring the line's stale group
  });

  it('coerces numeric fields and clamps duration to >= 0', () => {
    const [ev] = parseTimingJsonl(line({ duration_ms: '-50', ts: '12345' }));
    expect(ev.duration_ms).toBe(0);
    expect(ev.ts).toBe(12345);
  });

  it('derives ok from exit_code when ok is absent', () => {
    const a = JSON.parse(line({ exit_code: 1 })) as Record<string, unknown>;
    a.ok = undefined;
    const [evFail] = parseTimingJsonl(JSON.stringify(a));
    expect(evFail.ok).toBe(false);

    const b = JSON.parse(line()) as Record<string, unknown>;
    b.ok = undefined;
    b.exit_code = undefined;
    const [evNoCmd] = parseTimingJsonl(JSON.stringify(b));
    expect(evNoCmd.ok).toBe(true);
  });

  it('defaults missing repo to "unknown" and unknown kind to "mark"', () => {
    const [ev] = parseTimingJsonl(JSON.stringify({ category: 'lint', kind: 'weird' }));
    expect(ev.repo).toBe('unknown');
    expect(ev.kind).toBe('mark');
    expect(ev.duration_ms).toBe(0);
  });
});
