// cwip/site-smoke — the headless SITE LOAD+NAVIGATE smoke for the promotion gate +
// main-health watchdog. Boots the app the way the OWNER runs it (a real server, typically
// the vite DEV server), drives a headless browser, NAVIGATES every key route, and on each
// asserts: the React root mounted, no uncaught console/page errors, no vite import-analysis
// / failed-to-resolve / missing-module errors, and (optionally) a key landmark is present.
//
// The catch a single-page render smoke (or a cached/eager build) misses: a dev-only
// import-analysis "site will not load" failure on a route the user actually visits.
//
// Split: a PURE plan + decide + classify + heal core (no spawning, fully unit-tested) and
// an impure `runSiteSmoke` with every seam injected. Playwright is an OPTIONAL peer driven
// in a `node` subprocess; absence is INCONCLUSIVE (never blocks the gate), not a failure.
export {
  DEFAULT_IGNORE_CONSOLE,
  firstImportError,
  isIgnoredConsole,
  isViteImportError,
  VITE_IMPORT_ERROR_PATTERNS,
} from './classify';
export { decideRoute, decideSiteSmoke } from './decide';
export {
  type HealTarget,
  planSiteSmokeHeal,
  type SiteSmokeHealOptions,
  type SiteSmokeHealPlan,
  siteSmokeHealBody,
  siteSmokeHealReason,
  siteSmokeHealSlug,
} from './heal';
export { parseSiteProbe, SITE_SMOKE_HOST_SOURCE, SITE_SMOKE_PROBE_SENTINEL } from './host';
export { navBaseUrl, navServiceOf, planSiteSmoke, serviceTimeout, siteServiceEnv } from './plan';
export { defaultResolvePlaywright, pickFreePort, runSiteSmoke, siteSmokeHomeDir } from './run';
export type {
  RouteFailReason,
  RouteProbe,
  RouteVerdict,
  SiteProbe,
  SiteRoute,
  SiteService,
  SiteSmokeDeps,
  SiteSmokeResult,
  SiteSmokeSpec,
  SiteSmokeSpecInput,
  SiteSmokeVerdict,
  StartedService,
} from './types';
