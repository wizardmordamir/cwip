import { describe, expect, it } from 'bun:test';
import { runSiteSmoke } from './run';
import type { RouteProbe, SiteProbe, SiteService, SiteSmokeDeps, SiteSmokeSpec, StartedService } from './types';

const okRouteProbe = (path: string, over: Partial<RouteProbe> = {}): RouteProbe => ({
  path,
  navigated: true,
  status: 200,
  rootFound: true,
  rootHtmlLength: 400,
  landmarkChecked: false,
  landmarkFound: false,
  consoleErrors: [],
  pageErrors: [],
  ...over,
});

function makeSpec(over: Partial<SiteSmokeSpec> = {}): SiteSmokeSpec {
  return {
    repo: 'ca',
    cwd: '/repo',
    services: [
      {
        name: 'api',
        cmd: ['bun', 'api'],
        cwd: '/repo/server',
        port: 3001,
        homeEnvVar: 'CA_DATA_DIR',
        homeDir: '/tmp/ca-home',
        readyPath: '/api/health',
      },
      { name: 'web', cmd: ['bunx', 'vite'], cwd: '/repo/ui', port: 5173, readyPath: '/' },
    ],
    navService: 'web',
    routes: [{ path: '/' }, { path: '/dashboard' }],
    rootSelector: '#root',
    navTimeoutMs: 1000,
    ignoreConsole: [],
    ...over,
  };
}

interface Recorder {
  started: string[];
  stopped: string[];
  ensured: string[];
  removed: string[];
  builds: string[][];
  deps: SiteSmokeDeps;
}

function recorder(
  opts: {
    probe?: SiteProbe;
    startFail?: string;
    playwright?: string | null;
    build?: { code: number; output: string };
    buildThrows?: boolean;
    probeThrows?: boolean;
  } = {},
): Recorder {
  const r: Recorder = { started: [], stopped: [], ensured: [], removed: [], builds: [], deps: {} };
  r.deps = {
    resolvePlaywright: () => (opts.playwright === undefined ? '/pw/index.js' : opts.playwright),
    ensureDir: async (d) => {
      r.ensured.push(d);
    },
    removeDir: async (d) => {
      r.removed.push(d);
    },
    runBuild: async (cmd) => {
      r.builds.push(cmd);
      if (opts.buildThrows) throw new Error('cannot spawn build');
      return opts.build ?? { code: 0, output: 'built ok' };
    },
    startService: async (svc: SiteService): Promise<StartedService> => {
      if (opts.startFail && svc.name === opts.startFail) throw new Error(`boom booting ${svc.name}`);
      r.started.push(svc.name);
      return {
        name: svc.name,
        logs: () => [`${svc.name} log line`],
        stop: async () => {
          r.stopped.push(svc.name);
        },
      };
    },
    runProbe: async () => {
      if (opts.probeThrows) throw new Error('probe blew up');
      return opts.probe ?? { launched: true, routes: [okRouteProbe('/'), okRouteProbe('/dashboard')] };
    },
    now: () => 0,
  };
  return r;
}

describe('runSiteSmoke', () => {
  it('is inconclusive (ran:false) and boots NOTHING when playwright is absent', async () => {
    const r = recorder({ playwright: null });
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res).toMatchObject({ ran: false, ok: false });
    expect(res.detail).toContain('playwright not available');
    expect(r.started).toHaveLength(0);
  });

  it('greens a clean run: boots services in order, ensures+removes homes, tears down', async () => {
    const r = recorder();
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res).toMatchObject({ ran: true, ok: true });
    expect(r.started).toEqual(['api', 'web']); // companions first
    expect(r.ensured).toEqual(['/tmp/ca-home']);
    expect(r.removed).toEqual(['/tmp/ca-home']);
    expect(r.stopped.sort()).toEqual(['api', 'web']);
    expect(res.verdict?.routes).toHaveLength(2);
  });

  it('REDs (ran:true, ok:false) when a route has an import error, naming it', async () => {
    const r = recorder({
      probe: {
        launched: true,
        routes: [
          okRouteProbe('/'),
          okRouteProbe('/dashboard', {
            rootFound: false,
            rootHtmlLength: 0,
            pageErrors: ['Failed to resolve import "@emoji-mart/data"'],
          }),
        ],
      },
    });
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res).toMatchObject({ ran: true, ok: false });
    expect(res.detail).toContain('/dashboard');
    expect(res.verdict?.failed[0].importError).toBe(true);
    expect(r.stopped.sort()).toEqual(['api', 'web']); // still torn down
  });

  it('REDs definitively when the UI build fails (built-dist mode)', async () => {
    const r = recorder({ build: { code: 1, output: 'RollupError: could not resolve' } });
    const res = await runSiteSmoke(makeSpec({ buildCmd: ['bun', 'run', 'web:build'] }), r.deps);
    expect(res).toMatchObject({ ran: true, ok: false });
    expect(res.detail).toContain('UI build failed');
    expect(r.started).toHaveLength(0); // never boots if the build fails
  });

  it('is inconclusive when the build cannot even spawn', async () => {
    const r = recorder({ buildThrows: true });
    const res = await runSiteSmoke(makeSpec({ buildCmd: ['bun', 'run', 'web:build'] }), r.deps);
    expect(res).toMatchObject({ ran: false, ok: false });
    expect(res.detail).toContain('could not run UI build');
  });

  it("is inconclusive (boot failure is the boot smoke's job) when a service will not boot", async () => {
    const r = recorder({ startFail: 'web' });
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res).toMatchObject({ ran: false, ok: false });
    expect(res.detail).toContain('did not boot');
    // the api that DID start is torn down + the home removed
    expect(r.stopped).toContain('api');
    expect(r.removed).toContain('/tmp/ca-home');
  });

  it('is inconclusive when the probe throws (tooling failure, not a proven broken site)', async () => {
    const r = recorder({ probeThrows: true });
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res).toMatchObject({ ran: false, ok: false });
    expect(res.detail).toContain('site probe errored');
    expect(r.stopped.sort()).toEqual(['api', 'web']);
  });

  it('is inconclusive when launched but no routes were probed (host crashed mid-run)', async () => {
    const r = recorder({ probe: { launched: true, routes: [] } });
    const res = await runSiteSmoke(makeSpec(), r.deps);
    expect(res.ran).toBe(false);
  });
});
