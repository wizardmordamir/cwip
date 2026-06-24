import { describe, expect, it } from 'bun:test';
import { findingToTaskDraft } from './findingToTask';
import type { Finding } from './types';

const slowFinding: Finding = {
  kind: 'slow_route',
  severity: 'critical',
  dedupeKey: 'slow_route:GET:/api/foo',
  summary: 'Slow route GET /api/foo: p95 3200ms over 50 req',
  route: '/api/foo',
  method: 'GET',
  stats: { count: 50, p95DurationMs: 3200 },
  windowFromTs: 0,
  windowToTs: 60_000,
};

describe('findingToTaskDraft', () => {
  it('derives a stable slug from the dedupeKey (idempotent re-filing)', () => {
    const a = findingToTaskDraft(slowFinding, { repo: 'ca' });
    const b = findingToTaskDraft({ ...slowFinding, summary: 'different summary text' }, { repo: 'ca' });
    // Same issue (same dedupeKey) → same slug regardless of summary wording.
    expect(a.slug).toBe(b.slug);
    expect(a.slug).toBe('log-review-slow-route-get-api-foo');
  });

  it('carries the repo and a perf tag in the title', () => {
    const draft = findingToTaskDraft(slowFinding, { repo: 'ca' });
    expect(draft.repo).toBe('ca');
    expect(draft.title).toContain('[perf]');
    expect(draft.title).toContain('ca:');
    expect(draft.title).toContain('!!'); // critical marker
  });

  it('tags reliability for error spikes and ops for host anomalies', () => {
    expect(findingToTaskDraft({ ...slowFinding, kind: 'error_spike' }).title).toContain('[reliability]');
    expect(findingToTaskDraft({ ...slowFinding, kind: 'host_anomaly' }).title).toContain('[ops]');
  });

  it('writes a body with stats + window and marks noop_ok', () => {
    const draft = findingToTaskDraft(slowFinding, { repo: 'ca' });
    expect(draft.body).toContain('p95DurationMs: 3200');
    expect(draft.body).toContain('Window:');
    expect(draft.noop_ok).toBe(true);
  });

  it('honors a custom slug prefix', () => {
    expect(findingToTaskDraft(slowFinding, { slugPrefix: 'ru-log' }).slug).toStartWith('ru-log-');
  });
});
