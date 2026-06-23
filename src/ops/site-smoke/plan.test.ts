import { describe, expect, it } from 'bun:test';
import { DEFAULT_IGNORE_CONSOLE } from './classify';
import { navBaseUrl, navServiceOf, planSiteSmoke, serviceTimeout, siteServiceEnv } from './plan';
import type { SiteService } from './types';

const svc = (over: Partial<SiteService> = {}): SiteService => ({
  name: 'web',
  cmd: ['bun', 'x'],
  cwd: '/x',
  port: 5173,
  ...over,
});

describe('planSiteSmoke', () => {
  it('fills defaults', () => {
    const spec = planSiteSmoke({ repo: 'ru', cwd: '/r', services: [svc()], routes: [{ path: '/' }] });
    expect(spec.rootSelector).toBe('#root');
    expect(spec.navTimeoutMs).toBe(20_000);
    expect(spec.ignoreConsole).toEqual(DEFAULT_IGNORE_CONSOLE);
  });

  it('preserves overrides', () => {
    const spec = planSiteSmoke({
      repo: 'ru',
      cwd: '/r',
      services: [svc()],
      routes: [{ path: '/' }],
      rootSelector: '#app',
      navTimeoutMs: 5000,
      ignoreConsole: ['x'],
    });
    expect(spec.rootSelector).toBe('#app');
    expect(spec.navTimeoutMs).toBe(5000);
    expect(spec.ignoreConsole).toEqual(['x']);
  });

  it('rejects empty services / routes', () => {
    expect(() => planSiteSmoke({ repo: 'ru', cwd: '/r', services: [], routes: [{ path: '/' }] })).toThrow(/service/);
    expect(() => planSiteSmoke({ repo: 'ru', cwd: '/r', services: [svc()], routes: [] })).toThrow(/route/);
  });
});

describe('siteServiceEnv', () => {
  it('builds the isolation env (home + port) over extras', () => {
    const env = siteServiceEnv(
      svc({ portEnvVar: 'PORT', homeEnvVar: 'CA_DATA_DIR', homeDir: '/tmp/ca', extraEnv: { NODE_ENV: 'development' } }),
    );
    expect(env).toEqual({ NODE_ENV: 'development', PORT: '5173', CA_DATA_DIR: '/tmp/ca' });
  });

  it('omits home when no homeDir is set', () => {
    const env = siteServiceEnv(svc({ portEnvVar: 'PORT', homeEnvVar: 'CA_DATA_DIR' }));
    expect(env.CA_DATA_DIR).toBeUndefined();
    expect(env.PORT).toBe('5173');
  });
});

describe('navServiceOf / navBaseUrl', () => {
  it('selects the named nav service, else the last', () => {
    const api = svc({ name: 'api', port: 3000 });
    const web = svc({ name: 'web', port: 5173 });
    expect(
      navServiceOf(planSiteSmoke({ repo: 'ca', cwd: '/c', services: [api, web], routes: [{ path: '/' }] })).name,
    ).toBe('web');
    expect(
      navServiceOf(
        planSiteSmoke({ repo: 'ca', cwd: '/c', services: [api, web], navService: 'api', routes: [{ path: '/' }] }),
      ).name,
    ).toBe('api');
    expect(navBaseUrl(planSiteSmoke({ repo: 'ca', cwd: '/c', services: [api, web], routes: [{ path: '/' }] }))).toBe(
      'http://127.0.0.1:5173',
    );
  });
});

describe('serviceTimeout', () => {
  it('uses the service value, else the 45s default', () => {
    expect(serviceTimeout(svc())).toBe(45_000);
    expect(serviceTimeout(svc({ timeoutMs: 1000 }))).toBe(1000);
  });
});
