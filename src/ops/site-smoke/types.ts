/**
 * Shared types for the SITE LOAD+NAVIGATE smoke (`cwip/site-smoke`).
 *
 * This is the anti-"site will not load" layer for the promotion gate + main-health
 * watchdog. Unlike a single-page render smoke, it boots the app the way the OWNER
 * runs it (a real server — typically the vite DEV server, where import-analysis is
 * lazy + on-demand), drives a HEADLESS browser, NAVIGATES every key route, and on
 * EACH page asserts: the React root mounted, no uncaught console/page errors, no
 * vite import-analysis / failed-to-resolve / missing-module errors, and (optionally)
 * a key landmark is present.
 *
 * The split mirrors the rest of the gate: a PURE plan + decision core (planSiteSmoke
 * / decideRoute / decideSiteSmoke / classify — fully unit-testable, no spawning) and
 * an impure {@link SiteSmokeResult}-returning runner that boots services + drives a
 * browser, with every seam injected so tests never touch a real process/browser.
 */

/** One navigable route the smoke loads + asserts on. */
export interface SiteRoute {
  /** Path to navigate, relative to the nav service base URL (e.g. `/`, `/dashboard`, `/taskq`). */
  path: string;
  /** Human label for messages (defaults to {@link path}). */
  label?: string;
  /**
   * Optional landmark to assert is present after load. Either a CSS selector, or
   * `text=...` to assert visible text. When omitted, the only mount assertion is
   * that the React root is non-empty (the white-screen check) — deliberately robust
   * across auth redirects, since a login page still mounts a root.
   */
  landmark?: string;
  /** When true, a missing landmark is reported but does NOT fail the route. Default false. */
  landmarkOptional?: boolean;
  /** Per-route extra benign console substrings, merged over the spec's ignore list. */
  ignoreConsole?: string[];
}

/**
 * One process the smoke boots before navigating. A single-server app needs one
 * (the server itself); a vite dev setup needs two — the API + the vite dev server —
 * with the API booted first so the dev server's `/api` proxy resolves. Ports are
 * resolved by the caller (see {@link pickFreePort}) and baked into the spec, so any
 * cross-service env (e.g. a dev server's `VITE_BASE_URL` pointing at the API port)
 * is just an {@link extraEnv} entry.
 */
export interface SiteService {
  /** Label (e.g. `api`, `web`) — also selects the nav target via {@link SiteSmokeSpec.navService}. */
  name: string;
  /** Command + args to spawn. */
  cmd: string[];
  /** Working dir for the spawned process. */
  cwd: string;
  /** Bind port (assigned free); substituted into env via {@link portEnvVar} + the nav URL. */
  port: number;
  /** Env var that sets this service's listen port. */
  portEnvVar?: string;
  /** Env var that relocates this service's entire state footprint (the isolation knob). */
  homeEnvVar?: string;
  /** The throwaway dir {@link homeEnvVar} points at (created before boot, removed after). */
  homeDir?: string;
  /** Path polled (`http://127.0.0.1:<port><readyPath>`) until ready. Default `/`. */
  readyPath?: string;
  /** Extra env merged over the isolation vars (NODE_ENV, cross-service URLs, …). */
  extraEnv?: Record<string, string>;
  /** Treat a readiness Response as ready (default: status < 400). */
  isReady?: (res: Response) => boolean | Promise<boolean>;
  /** Max ms to wait for readiness (default 45s — a cold dev-server boot). */
  timeoutMs?: number;
}

/** The resolved, ready-to-run plan for one repo's site smoke. */
export interface SiteSmokeSpec {
  /** taskq repo alias (`app1`, `app2`, …) — labels the result. */
  repo: string;
  /** The checkout being smoked (for labels/logs; services carry their own cwd). */
  cwd: string;
  /** Optional one-shot UI build before booting (built-dist mode). Dev mode needs none. */
  buildCmd?: string[];
  /** Processes to boot, in order (companions first). */
  services: SiteService[];
  /** Which service's port the browser navigates against (by name). Default: the last service. */
  navService?: string;
  /** Routes to load + assert. */
  routes: SiteRoute[];
  /** Selector for the React root whose mount we assert per route (default `#root`). */
  rootSelector: string;
  /** Max ms to navigate + mount per route (the per-route browser bound). */
  navTimeoutMs: number;
  /** Benign console substrings (case-insensitive) ignored globally (default {@link DEFAULT_IGNORE_CONSOLE}). */
  ignoreConsole: string[];
}

/** Caller-supplied inputs; everything else is defaulted by {@link planSiteSmoke}. */
export interface SiteSmokeSpecInput {
  repo: string;
  cwd: string;
  buildCmd?: string[];
  services: SiteService[];
  navService?: string;
  routes: SiteRoute[];
  rootSelector?: string;
  navTimeoutMs?: number;
  ignoreConsole?: string[];
}

/** What the Node Playwright host reports back about ONE navigated route. */
export interface RouteProbe {
  /** The route path that was navigated. */
  path: string;
  /** Did the page navigate (no nav error / timeout)? */
  navigated: boolean;
  /** HTTP status of the document response (vite import-analysis failures often 500). */
  status?: number;
  /** Was the root selector present in the DOM after load? */
  rootFound: boolean;
  /** Trimmed `innerHTML` length of the root — `0` ⇒ an empty (un-mounted) root. */
  rootHtmlLength: number;
  /** Did this route assert a landmark at all? */
  landmarkChecked: boolean;
  /** Was the asserted landmark present? */
  landmarkFound: boolean;
  /** Text of the vite dev error overlay if it appeared (the gold dev-mode signal). */
  overlayError?: string;
  /** Console messages logged at `error` level during this route's load. */
  consoleErrors: string[];
  /** Messages of every UNCAUGHT page exception during this route's load. */
  pageErrors: string[];
  /** Nav error for THIS route (timeout / net error). */
  error?: string;
}

/** What the host reports for the whole run. `launched:false` ⇒ inconclusive. */
export interface SiteProbe {
  /** Did a browser actually launch? `false` ⇒ the check could not run (inconclusive). */
  launched: boolean;
  /** Per-route results, in navigation order. */
  routes: RouteProbe[];
  /** Host-level failure (browser couldn't launch / a fatal host crash). */
  error?: string;
}

/** Failure category for a single route. */
export type RouteFailReason =
  | 'ok'
  | 'nav'
  | 'white-screen'
  | 'import-error'
  | 'console-error'
  | 'page-error'
  | 'landmark';

/** The verdict of evaluating one {@link RouteProbe} against the spec. */
export interface RouteVerdict {
  path: string;
  label: string;
  ok: boolean;
  reason: RouteFailReason;
  detail: string;
  /** The exact offending message when applicable (named verbatim in the heal task). */
  offending?: string;
  /** True when the failure is a vite/import resolution failure (the headline class). */
  importError: boolean;
}

/** The verdict of evaluating a whole {@link SiteProbe}. */
export interface SiteSmokeVerdict {
  /** Did the check RUN to a conclusion (browser launched + routes probed)? */
  ran: boolean;
  /** Did EVERY route load + navigate clean? Meaningless when `!ran`. */
  ok: boolean;
  /** Human-readable summary (the success line, or the first failing route + reason). */
  detail: string;
  /** Per-route verdicts, in order. */
  routes: RouteVerdict[];
  /** Just the failing routes (what the heal task names). */
  failed: RouteVerdict[];
}

/** The outcome of one repo's site smoke. */
export interface SiteSmokeResult {
  repo: string;
  /** Did the check run to a conclusion? An inconclusive run is `ran:false, ok:false`. */
  ran: boolean;
  /** Did the whole site load + navigate clean? Only meaningful when `ran`. */
  ok: boolean;
  /** Human-readable summary. */
  detail: string;
  /** Last lines of the booted services' output (gold when a page error traces to the API). */
  logTail?: string;
  /** The raw probe, for diagnostics. */
  probe?: SiteProbe;
  /** The decoded verdict (per-route), for the heal-task body. */
  verdict?: SiteSmokeVerdict;
  durationMs: number;
}

/** A started service handle (so the runner can read logs + tear it down). */
export interface StartedService {
  name: string;
  logs(): string[];
  stop(): Promise<void>;
}

/** Injectable seams so {@link runSiteSmoke} is unit-testable without a real process/browser. */
export interface SiteSmokeDeps {
  /** Boot one service + wait for readiness. Defaults to a real `node:child_process` spawn. */
  startService?: (svc: SiteService) => Promise<StartedService>;
  /**
   * Drive a headless browser over the routes + report a {@link SiteProbe}. Defaults to the
   * Node Playwright host. `playwrightPath` is the resolved `playwright` entry (a test seam
   * can ignore it).
   */
  runProbe?: (baseUrl: string, spec: SiteSmokeSpec, playwrightPath: string) => Promise<SiteProbe>;
  /** Run `spec.buildCmd` in `cwd` before booting (built-dist mode). Defaults to a real spawn. */
  runBuild?: (cmd: string[], cwd: string) => Promise<{ code: number; output: string }>;
  ensureDir?: (dir: string) => Promise<void>;
  removeDir?: (dir: string) => Promise<void>;
  /** Resolve the `playwright` entry path from a dir; `null` ⇒ absent (inconclusive). */
  resolvePlaywright?: (fromDir: string) => string | null;
  now?: () => number;
}
