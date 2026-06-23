import { describe, expect, it } from 'bun:test';
import { decideRoute, decideSiteSmoke } from './decide';
import { planSiteSmoke } from './plan';
import type { RouteProbe, SiteProbe, SiteRoute, SiteSmokeSpec } from './types';

const spec = (over: Partial<SiteSmokeSpec> = {}): SiteSmokeSpec =>
  planSiteSmoke({
    repo: 'ru',
    cwd: '/x',
    services: [{ name: 'web', cmd: ['x'], cwd: '/x', port: 1234 }],
    routes: [{ path: '/' }, { path: '/dashboard' }, { path: '/taskq', label: 'Orchestration' }],
    ...over,
  });

const probe = (over: Partial<RouteProbe> = {}): RouteProbe => ({
  path: '/',
  navigated: true,
  status: 200,
  rootFound: true,
  rootHtmlLength: 500,
  landmarkChecked: false,
  landmarkFound: false,
  consoleErrors: [],
  pageErrors: [],
  ...over,
});

const route = (over: Partial<SiteRoute> = {}): SiteRoute => ({ path: '/', ...over });

describe('decideRoute', () => {
  it('passes a clean mounted route', () => {
    const v = decideRoute(probe(), route(), spec());
    expect(v.ok).toBe(true);
    expect(v.reason).toBe('ok');
    expect(v.importError).toBe(false);
  });

  it('fails a route that never navigated', () => {
    const v = decideRoute(probe({ navigated: false, error: 'timeout' }), route(), spec());
    expect(v).toMatchObject({ ok: false, reason: 'nav' });
    expect(v.detail).toContain('timeout');
  });

  it('treats a vite error overlay as a named import error (highest priority)', () => {
    const v = decideRoute(
      probe({ overlayError: 'Failed to resolve import "@emoji-mart/data"', rootFound: false, rootHtmlLength: 0 }),
      route(),
      spec(),
    );
    expect(v).toMatchObject({ ok: false, reason: 'import-error', importError: true });
    expect(v.offending).toContain('@emoji-mart/data');
  });

  it('names an import error from the page/console over the white-screen symptom it caused', () => {
    const v = decideRoute(
      probe({
        rootFound: true,
        rootHtmlLength: 0,
        pageErrors: ["does not provide an export named 'ChartThemeProvider'"],
      }),
      route(),
      spec(),
    );
    expect(v).toMatchObject({ ok: false, reason: 'import-error', importError: true });
    expect(v.offending).toContain('ChartThemeProvider');
  });

  it('flags a 5xx document as an import/transform failure', () => {
    const v = decideRoute(probe({ status: 500, rootFound: false, rootHtmlLength: 0 }), route(), spec());
    expect(v).toMatchObject({ ok: false, reason: 'import-error', importError: true, offending: 'HTTP 500' });
  });

  it('reports a white screen when the root never mounted (no import error present)', () => {
    const v = decideRoute(probe({ rootFound: true, rootHtmlLength: 0 }), route(), spec());
    expect(v).toMatchObject({ ok: false, reason: 'white-screen', importError: false });
  });

  it('fails on a fatal (non-ignored) console error', () => {
    const v = decideRoute(probe({ consoleErrors: ['Uncaught TypeError: x is not a function'] }), route(), spec());
    expect(v).toMatchObject({ ok: false, reason: 'console-error' });
  });

  it('ignores benign console noise (favicon 404)', () => {
    const v = decideRoute(probe({ consoleErrors: ['GET /favicon.ico 404 (Not Found)'] }), route(), spec());
    expect(v.ok).toBe(true);
  });

  it('honors a per-route ignore list', () => {
    const v = decideRoute(
      probe({ consoleErrors: ['flaky widget boot warning'] }),
      route({ ignoreConsole: ['flaky widget'] }),
      spec(),
    );
    expect(v.ok).toBe(true);
  });

  it('fails on an uncaught page error', () => {
    const v = decideRoute(probe({ pageErrors: ['ReferenceError: foo is not defined'] }), route(), spec());
    expect(v).toMatchObject({ ok: false, reason: 'page-error' });
  });

  it('fails when a required landmark is missing', () => {
    const v = decideRoute(
      probe({ landmarkChecked: true, landmarkFound: false }),
      route({ landmark: 'text=Dashboard' }),
      spec(),
    );
    expect(v).toMatchObject({ ok: false, reason: 'landmark', offending: 'text=Dashboard' });
  });

  it('does not fail an optional missing landmark', () => {
    const v = decideRoute(
      probe({ landmarkChecked: true, landmarkFound: false }),
      route({ landmark: '.x', landmarkOptional: true }),
      spec(),
    );
    expect(v.ok).toBe(true);
  });
});

describe('decideSiteSmoke', () => {
  it('is inconclusive when the browser never launched (never blocks the gate)', () => {
    const v = decideSiteSmoke({ launched: false, routes: [], error: 'playwright not available' }, spec());
    expect(v).toMatchObject({ ran: false, ok: false });
    expect(v.detail).toContain('could not run');
  });

  it('is inconclusive when launched but nothing was probed', () => {
    const v = decideSiteSmoke({ launched: true, routes: [] }, spec());
    expect(v.ran).toBe(false);
  });

  it('is green when every route loads clean', () => {
    const sp: SiteProbe = {
      launched: true,
      routes: [probe({ path: '/' }), probe({ path: '/dashboard' }), probe({ path: '/taskq' })],
    };
    const v = decideSiteSmoke(sp, spec());
    expect(v).toMatchObject({ ran: true, ok: true });
    expect(v.failed).toHaveLength(0);
    expect(v.detail).toContain('3 route(s)');
  });

  it('reports the first failure + counts import failures, naming the failing route', () => {
    const sp: SiteProbe = {
      launched: true,
      routes: [
        probe({ path: '/' }),
        probe({
          path: '/dashboard',
          pageErrors: ['Failed to resolve import "x"'],
          rootFound: false,
          rootHtmlLength: 0,
        }),
        probe({ path: '/taskq', consoleErrors: ['Uncaught Error: boom'] }),
      ],
    };
    const v = decideSiteSmoke(sp, spec());
    expect(v.ok).toBe(false);
    expect(v.failed).toHaveLength(2);
    expect(v.detail).toContain('/dashboard');
    expect(v.detail).toContain('import/resolve');
    // The /taskq verdict carries the right label from the spec.
    const taskq = v.routes.find((r) => r.path === '/taskq');
    expect(taskq?.label).toBe('Orchestration');
  });
});
