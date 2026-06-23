import { DEFAULT_IGNORE_CONSOLE } from './classify';
import type { SiteService, SiteSmokeSpec, SiteSmokeSpecInput } from './types';

const DEFAULT_NAV_TIMEOUT_MS = 20_000;
const DEFAULT_ROOT_SELECTOR = '#root';
const DEFAULT_SERVICE_TIMEOUT_MS = 45_000;

/** Pure: fill defaults to produce a complete, runnable {@link SiteSmokeSpec}. */
export function planSiteSmoke(input: SiteSmokeSpecInput): SiteSmokeSpec {
  if (!input.services?.length) throw new Error('planSiteSmoke: at least one service is required');
  if (!input.routes?.length) throw new Error('planSiteSmoke: at least one route is required');
  return {
    repo: input.repo,
    cwd: input.cwd,
    buildCmd: input.buildCmd,
    services: input.services,
    navService: input.navService,
    routes: input.routes,
    rootSelector: input.rootSelector ?? DEFAULT_ROOT_SELECTOR,
    navTimeoutMs: input.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
    ignoreConsole: input.ignoreConsole ?? DEFAULT_IGNORE_CONSOLE,
  };
}

/**
 * Pure: the env one service runs under — its isolation knobs (home + port) plus any
 * extras. The home var relocates ALL of the app's state to a throwaway dir, so the
 * smoke never reads or writes the real `~/.rubato` / ca's data dir.
 */
export function siteServiceEnv(svc: SiteService): Record<string, string> {
  const env: Record<string, string> = { ...svc.extraEnv };
  if (svc.portEnvVar) env[svc.portEnvVar] = String(svc.port);
  if (svc.homeEnvVar && svc.homeDir) env[svc.homeEnvVar] = svc.homeDir;
  return env;
}

/** Pure: the service the browser navigates against (by name, else the last one). */
export function navServiceOf(spec: SiteSmokeSpec): SiteService {
  if (spec.navService) {
    const found = spec.services.find((s) => s.name === spec.navService);
    if (found) return found;
  }
  return spec.services[spec.services.length - 1];
}

/** Pure: the readiness timeout for a service (its own, else the default). */
export function serviceTimeout(svc: SiteService): number {
  return svc.timeoutMs ?? DEFAULT_SERVICE_TIMEOUT_MS;
}

/** Pure: the base URL the browser navigates against for this spec. */
export function navBaseUrl(spec: SiteSmokeSpec): string {
  return `http://127.0.0.1:${navServiceOf(spec).port}`;
}
