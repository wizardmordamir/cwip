import { describe, expect, it } from 'bun:test';
import { createRunReport } from './recorder';
import { renderReportHtml, renderReportText, summarizeReport } from './render';

// NOTE: the fs-touching primitives (writeReportFiles) are intentionally NOT
// exercised here — cwip's test preload virtualizes node:fs (see scripts/testSetup
// → enableSystemMocks), so real file/dir round-trips can't be observed. They're
// validated for real in the cursedalchemy testkit, where node:fs is not mocked.
// Pure model + renderer logic is covered below.

const sampleRun = () => {
  const rec = createRunReport('functional', { id: 'functional-fixed', startedAt: '2026-01-01T00:00:00.000Z' });
  rec.record({ name: 'creates a list', suite: 'lists', status: 'passed', durationMs: 12 });
  rec.record({
    name: 'rejects unauthorized read',
    suite: 'sharing',
    status: 'failed',
    durationMs: 8,
    error: { message: 'expected 403, got 200', stack: 'at sharing.spec.ts:42:1' },
    context: { method: 'GET', url: '/api/lists/abc', recipient: 'user-2' },
  });
  rec.record({ name: 'todo: groups', suite: 'sharing', status: 'skipped' });
  return rec.finish('2026-01-01T00:00:03.200Z');
};

describe('createRunReport', () => {
  it('tracks totals and a finished duration', () => {
    const r = sampleRun();
    expect(r.totals).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1, todo: 0 });
    expect(r.durationMs).toBe(3200);
    expect(summarizeReport(r)).toBe('functional: 1 passed, 1 failed, 1 skipped (3.2s)');
  });
});

describe('renderers', () => {
  it('text report surfaces failure message, stack, context and artifacts', () => {
    const rec = createRunReport('e2e');
    rec.record({
      name: 'login flow',
      suite: 'auth',
      status: 'failed',
      error: { message: 'expected 403, got 200', stack: 'at sharing.spec.ts:42:1' },
      context: { url: '/api/lists/abc' },
      artifacts: [{ kind: 'screenshot', name: 'login', path: 'e2e-1-artifacts/0-0-login.png' }],
    });
    const txt = renderReportText(rec.finish());
    expect(txt).toContain('✗');
    expect(txt).toContain('expected 403, got 200');
    expect(txt).toContain('sharing.spec.ts:42');
    expect(txt).toContain('/api/lists/abc');
    expect(txt).toContain('[screenshot] login');
  });

  it('html report escapes content, marks failures and inlines screenshots', () => {
    const rec = createRunReport('e2e');
    rec.record({
      name: '<script>x</script>',
      status: 'failed',
      error: { message: 'a < b & c' },
      artifacts: [{ kind: 'screenshot', name: 'shot', path: 'e2e-art/shot.png' }],
    });
    const html = renderReportHtml(rec.finish());
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &lt; b &amp; c');
    expect(html).toContain('st-failed');
    expect(html).toContain('<img src="e2e-art/shot.png"');
  });
});
