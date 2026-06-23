import type { RouteProbe, SiteProbe } from './types';

/** Sentinel the Node host prefixes its single result line with, so we can find it amid noise. */
export const SITE_SMOKE_PROBE_SENTINEL = 'SITE_SMOKE_PROBE:';

/**
 * The one-shot Node Playwright host, embedded as source so it ships in `dist` without a
 * copy-asset step and is written to a temp `.mjs` at runtime (see `runSiteSmoke`).
 *
 * Playwright cannot be driven under Bun (chromium.launch hangs), so the browser work runs
 * in a `node` subprocess. It reads a JSON `--config` (baseUrl + routes + selectors + the
 * resolved playwright entry path), launches ONE headless browser, navigates EACH route in
 * turn, and for each collects: nav status, root mount, the vite dev error overlay, every
 * console-error + uncaught page exception, and an optional landmark. It then prints EXACTLY
 * one machine-readable `SITE_SMOKE_PROBE:{…}` line and exits 0 — a broken site is DATA, not
 * a crash. It only reports `launched:false` when a browser can't even start, so the gate can
 * treat "couldn't run" as inconclusive rather than as a failed site.
 *
 * Written with string concatenation (no template literals / no `${}`) so it survives being
 * embedded here via `String.raw`.
 */
export const SITE_SMOKE_HOST_SOURCE = String.raw`import { readFileSync } from 'node:fs';

function emitAndExit(probe) {
  const full = { launched: false, routes: [], ...probe };
  process.stdout.write('\nSITE_SMOKE_PROBE:' + JSON.stringify(full) + '\n');
}

function readConfig(argv) {
  const i = argv.indexOf('--config');
  if (i === -1 || !argv[i + 1]) return null;
  try { return JSON.parse(readFileSync(argv[i + 1], 'utf8')); } catch (e) { return null; }
}

async function launchBrowser(chromium) {
  try { return await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { /* no system chrome */ }
  return chromium.launch({ headless: true });
}

async function probeRoute(page, baseUrl, route, rootSelector, navTimeoutMs) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => { try { if (msg.type() === 'error') consoleErrors.push(msg.text()); } catch (e) {} };
  const onPageError = (err) => { pageErrors.push(err && err.message ? err.message : String(err)); };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  const result = {
    path: route.path, navigated: false, status: undefined, rootFound: false, rootHtmlLength: 0,
    landmarkChecked: !!route.landmark, landmarkFound: false, overlayError: undefined,
    consoleErrors: consoleErrors, pageErrors: pageErrors, error: undefined,
  };
  try {
    let response = null;
    try {
      response = await page.goto(baseUrl + route.path, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
      result.navigated = true;
      if (response) result.status = response.status();
    } catch (e) {
      result.error = e && e.message ? e.message : String(e);
    }
    if (result.navigated) {
      try {
        await page.waitForFunction(
          (sel) => { const el = document.querySelector(sel); return !!el && el.innerHTML.trim().length > 0; },
          rootSelector,
          { timeout: Math.min(navTimeoutMs, 10000) },
        );
      } catch (e) { /* never mounted within the bound — read the still-empty state below */ }
      await page.waitForTimeout(150);
      try {
        const state = await page.evaluate((args) => {
          const rootEl = document.querySelector(args.sel);
          const out = { found: !!rootEl, len: rootEl ? rootEl.innerHTML.trim().length : 0, overlay: undefined, landmarkFound: false };
          const overlay = document.querySelector('vite-error-overlay');
          if (overlay) {
            const sr = overlay.shadowRoot;
            const msg = sr && sr.querySelector('.message') ? sr.querySelector('.message').textContent : '';
            const file = sr && sr.querySelector('.file') ? sr.querySelector('.file').textContent : '';
            out.overlay = ((msg || '') + ' ' + (file || '')).trim() || 'vite error overlay present';
          }
          if (args.landmark) {
            if (args.landmark.indexOf('text=') === 0) {
              const needle = args.landmark.slice(5);
              const text = document.body && document.body.innerText ? document.body.innerText : '';
              out.landmarkFound = text.indexOf(needle) !== -1;
            } else {
              out.landmarkFound = !!document.querySelector(args.landmark);
            }
          }
          return out;
        }, { sel: rootSelector, landmark: route.landmark || '' });
        result.rootFound = state.found;
        result.rootHtmlLength = state.len;
        result.overlayError = state.overlay;
        result.landmarkFound = state.landmarkFound;
      } catch (e) {
        result.error = result.error || ('evaluate failed: ' + (e && e.message ? e.message : String(e)));
      }
    }
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
  return result;
}

async function main() {
  const cfg = readConfig(process.argv.slice(2));
  if (!cfg || !cfg.baseUrl || !Array.isArray(cfg.routes)) {
    emitAndExit({ launched: false, error: 'invalid or missing --config' });
    return;
  }
  let chromium;
  try {
    const pwPath = cfg.playwrightPath || 'playwright';
    ({ chromium } = await import(pwPath));
  } catch (e) {
    emitAndExit({ launched: false, error: 'playwright not available: ' + (e && e.message ? e.message : String(e)) });
    return;
  }
  let browser;
  try { browser = await launchBrowser(chromium); } catch (e) {
    emitAndExit({ launched: false, error: 'could not launch a browser: ' + (e && e.message ? e.message : String(e)) });
    return;
  }
  const routes = [];
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const navTimeoutMs = Number(cfg.navTimeoutMs) || 20000;
    const rootSelector = cfg.rootSelector || '#root';
    for (const route of cfg.routes) {
      try {
        routes.push(await probeRoute(page, cfg.baseUrl, route, rootSelector, navTimeoutMs));
      } catch (e) {
        routes.push({ path: route.path, navigated: false, rootFound: false, rootHtmlLength: 0, landmarkChecked: !!route.landmark, landmarkFound: false, consoleErrors: [], pageErrors: [], error: 'route probe crashed: ' + (e && e.message ? e.message : String(e)) });
      }
    }
    emitAndExit({ launched: true, routes });
  } catch (e) {
    emitAndExit({ launched: true, routes, error: e && e.message ? e.message : String(e) });
  } finally {
    try { await browser.close(); } catch (e) { /* best-effort */ }
  }
}

main().catch((e) => { emitAndExit({ launched: false, error: 'site smoke host crashed: ' + (e && e.message ? e.message : String(e)) }); });
`;

const coerceRoute = (p: Partial<RouteProbe> & { path?: string }): RouteProbe => ({
  path: typeof p.path === 'string' ? p.path : '',
  navigated: !!p.navigated,
  status: typeof p.status === 'number' ? p.status : undefined,
  rootFound: !!p.rootFound,
  rootHtmlLength: typeof p.rootHtmlLength === 'number' ? p.rootHtmlLength : 0,
  landmarkChecked: !!p.landmarkChecked,
  landmarkFound: !!p.landmarkFound,
  overlayError: typeof p.overlayError === 'string' && p.overlayError ? p.overlayError : undefined,
  consoleErrors: Array.isArray(p.consoleErrors) ? p.consoleErrors.map(String) : [],
  pageErrors: Array.isArray(p.pageErrors) ? p.pageErrors.map(String) : [],
  error: typeof p.error === 'string' && p.error ? p.error : undefined,
});

/**
 * Parse the Node host's stdout into a {@link SiteProbe}. The host prints exactly one
 * `SITE_SMOKE_PROBE:{…}` line; if it's absent (the host crashed before emitting), we
 * return an inconclusive probe carrying the captured stderr tail.
 */
export function parseSiteProbe(stdout: string, stderr = ''): SiteProbe {
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.includes(SITE_SMOKE_PROBE_SENTINEL));
  if (line) {
    try {
      const json = line.slice(line.indexOf(SITE_SMOKE_PROBE_SENTINEL) + SITE_SMOKE_PROBE_SENTINEL.length).trim();
      const p = JSON.parse(json) as Partial<SiteProbe>;
      return {
        launched: !!p.launched,
        routes: Array.isArray(p.routes) ? p.routes.map(coerceRoute) : [],
        error: typeof p.error === 'string' && p.error ? p.error : undefined,
      };
    } catch {
      /* fall through to the inconclusive shape */
    }
  }
  const tail = stderr
    .split('\n')
    .filter((l) => l.trim())
    .slice(-6)
    .join('\n');
  return { launched: false, routes: [], error: `no site smoke result emitted${tail ? `: ${tail}` : ''}` };
}
