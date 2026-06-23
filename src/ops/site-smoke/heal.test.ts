import { describe, expect, it } from 'bun:test';
import { planSiteSmokeHeal, siteSmokeHealBody, siteSmokeHealReason, siteSmokeHealSlug } from './heal';
import type { RouteVerdict, SiteSmokeResult, SiteSmokeVerdict } from './types';

const rv = (over: Partial<RouteVerdict>): RouteVerdict => ({
  path: '/',
  label: '/',
  ok: false,
  reason: 'console-error',
  detail: 'x',
  importError: false,
  ...over,
});

const verdict = (failed: RouteVerdict[]): SiteSmokeVerdict => ({
  ran: true,
  ok: false,
  detail: 'failed',
  routes: failed,
  failed,
});

const result = (v: SiteSmokeVerdict, over: Partial<SiteSmokeResult> = {}): SiteSmokeResult => ({
  repo: 'ca',
  ran: true,
  ok: false,
  detail: v.detail,
  verdict: v,
  logTail: 'server log tail',
  durationMs: 10,
  ...over,
});

describe('siteSmokeHealSlug', () => {
  it('is deterministic per repo + target (so the watchdog can dedup)', () => {
    expect(siteSmokeHealSlug('ca', 'main')).toBe('heal-ca-main');
    expect(siteSmokeHealSlug('ru', 'integration')).toBe('heal-ru-integration');
  });
});

describe('siteSmokeHealReason', () => {
  it('leads with the first import failure when present', () => {
    const v = verdict([
      rv({ path: '/dashboard', reason: 'white-screen' }),
      rv({ path: '/charts', reason: 'import-error', importError: true }),
    ]);
    expect(siteSmokeHealReason(v)).toBe('import/resolve failure on /charts');
  });

  it('falls back to the first failure otherwise', () => {
    expect(siteSmokeHealReason(verdict([rv({ path: '/x', reason: 'white-screen' })]))).toBe('white screen on /x');
  });
});

describe('siteSmokeHealBody', () => {
  it('names every failing route + error, lists import errors first, and includes the log tail', () => {
    const v = verdict([
      rv({
        path: '/dashboard',
        reason: 'console-error',
        detail: 'Uncaught Error: boom',
        offending: 'Uncaught Error: boom',
      }),
      rv({
        path: '/charts',
        reason: 'import-error',
        importError: true,
        detail: 'import/resolve error: does not provide an export named ChartThemeProvider',
      }),
    ]);
    const body = siteSmokeHealBody(result(v), { target: 'integration', reproduceCmd: 'bun run dev' });
    // import error sorted to the top
    const charts = body.indexOf('/charts');
    const dash = body.indexOf('/dashboard');
    expect(charts).toBeGreaterThan(-1);
    expect(charts).toBeLessThan(dash);
    expect(body).toContain('ChartThemeProvider');
    expect(body).toContain('bun run dev');
    expect(body).toContain('refactor/integration');
    expect(body).toContain('server log tail');
    expect(body).toContain('SYMLINKED');
  });

  it('uses promotion-only wording for a main-target heal (fix on integration, never main)', () => {
    const v = verdict([
      rv({ path: '/', reason: 'import-error', importError: true, detail: 'import/resolve error: x' }),
    ]);
    const body = siteSmokeHealBody(result(v, { repo: 'ru' }), { target: 'main' });
    expect(body).toContain('WILL NOT LOAD on main');
    expect(body).toContain('PROMOTION-ONLY');
    expect(body).toContain('do NOT commit on main');
  });

  it('tolerates a result without verdict detail', () => {
    const body = siteSmokeHealBody(
      { repo: 'ca', ran: true, ok: false, detail: 'broken', durationMs: 1 },
      { target: 'integration' },
    );
    expect(body).toContain('no per-route detail');
  });
});

describe('planSiteSmokeHeal', () => {
  const importV = () =>
    verdict([rv({ path: '/charts', reason: 'import-error', importError: true, detail: 'import/resolve error: x' })]);

  it('files a deduped, titled heal on a conclusive failure', () => {
    const plan = planSiteSmokeHeal(result(importV(), { repo: 'ca' }), { target: 'main', reproduceCmd: 'bun run dev' });
    expect(plan.shouldFile).toBe(true);
    expect(plan.slug).toBe('heal-ca-main'); // stable dedup key
    expect(plan.title).toBe('ca site will not load on main (owner localhost) — import/resolve failure on /charts');
    expect(plan.reason).toBe('import/resolve failure on /charts');
    expect(plan.body).toContain('WILL NOT LOAD on main');
    expect(plan.body).toContain('bun run dev');
  });

  it('does NOT file on an INCONCLUSIVE run (ran:false) — the gate-never-blocks invariant', () => {
    const plan = planSiteSmokeHeal(
      { repo: 'ru', ran: false, ok: false, detail: 'no browser', durationMs: 0 },
      { target: 'integration' },
    );
    expect(plan.shouldFile).toBe(false);
    expect(plan.slug).toBe('heal-ru-integration');
  });

  it('does NOT file a verdict whose own ran is false (host launched but probed nothing)', () => {
    const v: SiteSmokeVerdict = { ran: false, ok: false, detail: 'probed no routes', routes: [], failed: [] };
    const plan = planSiteSmokeHeal(result(v, { ran: true }), { target: 'integration' });
    expect(plan.shouldFile).toBe(false);
  });

  it('does NOT file on a GREEN run', () => {
    const v: SiteSmokeVerdict = { ran: true, ok: true, detail: 'all clean', routes: [], failed: [] };
    const plan = planSiteSmokeHeal(result(v, { ok: true }), { target: 'integration' });
    expect(plan.shouldFile).toBe(false);
  });

  it('uses integration wording + slug for an integration target', () => {
    const plan = planSiteSmokeHeal(result(importV(), { repo: 'ru' }), { target: 'integration' });
    expect(plan.slug).toBe('heal-ru-integration');
    expect(plan.title).toContain('refactor/integration');
  });
});
