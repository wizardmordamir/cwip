import { firstImportError, isIgnoredConsole, isViteImportError } from './classify';
import type { RouteProbe, RouteVerdict, SiteProbe, SiteRoute, SiteSmokeSpec, SiteSmokeVerdict } from './types';

const labelOf = (route: SiteRoute) => route.label ?? route.path;

/**
 * PURE: turn one {@link RouteProbe} into a {@link RouteVerdict}. The ladder — in
 * priority order, because the FIRST cause is the most useful to name:
 *  - never navigated                          → RED `nav` (route unreachable).
 *  - a vite error overlay appeared            → RED `import-error` (the dev gold signal).
 *  - a console/page message is an import error → RED `import-error` (always fatal, named).
 *  - root empty / absent                      → RED `white-screen` (React never mounted).
 *  - a fatal (non-ignored) console error fired → RED `console-error`.
 *  - an uncaught page exception fired          → RED `page-error`.
 *  - a required landmark is missing            → RED `landmark`.
 *  - else                                      → GREEN.
 */
export function decideRoute(probe: RouteProbe, route: SiteRoute, spec: SiteSmokeSpec): RouteVerdict {
  const label = labelOf(route);
  const ignore = [...spec.ignoreConsole, ...(route.ignoreConsole ?? [])];
  const base = { path: route.path, label } as const;

  if (!probe.navigated) {
    return {
      ...base,
      ok: false,
      reason: 'nav',
      importError: false,
      detail: `did not load${probe.error ? `: ${probe.error}` : ''}`,
    };
  }

  // The vite dev error overlay is virtually always an import/transform failure.
  if (probe.overlayError) {
    return {
      ...base,
      ok: false,
      reason: 'import-error',
      importError: true,
      offending: probe.overlayError,
      detail: `vite error overlay: ${probe.overlayError}`,
    };
  }

  // Import/resolution errors are ALWAYS fatal (never benign-ignored) and named first —
  // they are the root cause of the white screen, so naming them beats naming the symptom.
  const allMessages = [...probe.pageErrors, ...probe.consoleErrors];
  const importMsg = firstImportError(allMessages);
  if (importMsg) {
    return {
      ...base,
      ok: false,
      reason: 'import-error',
      importError: true,
      offending: importMsg,
      detail: `import/resolve error: ${importMsg}`,
    };
  }
  // A 5xx document response with no overlay yet is still a server/transform failure.
  if (typeof probe.status === 'number' && probe.status >= 500) {
    return {
      ...base,
      ok: false,
      reason: 'import-error',
      importError: true,
      offending: `HTTP ${probe.status}`,
      detail: `server returned HTTP ${probe.status} for the document`,
    };
  }

  if (!probe.rootFound || probe.rootHtmlLength <= 0) {
    return {
      ...base,
      ok: false,
      reason: 'white-screen',
      importError: false,
      detail: `WHITE SCREEN — React root (${spec.rootSelector}) ${probe.rootFound ? 'is empty' : 'is missing'} after load (it never mounted)`,
    };
  }

  const fatalConsole = probe.consoleErrors.filter((m) => !isIgnoredConsole(m, ignore) && !isViteImportError(m));
  if (fatalConsole.length > 0) {
    return {
      ...base,
      ok: false,
      reason: 'console-error',
      importError: false,
      offending: fatalConsole[0],
      detail: `${fatalConsole.length} console error(s); first: ${fatalConsole[0]}`,
    };
  }
  if (probe.pageErrors.length > 0) {
    return {
      ...base,
      ok: false,
      reason: 'page-error',
      importError: false,
      offending: probe.pageErrors[0],
      detail: `${probe.pageErrors.length} uncaught page error(s); first: ${probe.pageErrors[0]}`,
    };
  }

  if (route.landmark && probe.landmarkChecked && !probe.landmarkFound && !route.landmarkOptional) {
    return {
      ...base,
      ok: false,
      reason: 'landmark',
      importError: false,
      offending: route.landmark,
      detail: `landmark not found: ${route.landmark}`,
    };
  }

  return {
    ...base,
    ok: true,
    reason: 'ok',
    importError: false,
    detail: `loaded clean (${probe.rootHtmlLength} bytes)`,
  };
}

/**
 * PURE: evaluate a whole {@link SiteProbe}. A run that could not launch a browser is
 * INCONCLUSIVE (`ran:false`) and must never block the gate; otherwise every route is
 * judged and the site is green iff all routes are.
 */
export function decideSiteSmoke(probe: SiteProbe, spec: SiteSmokeSpec): SiteSmokeVerdict {
  if (!probe.launched) {
    return {
      ran: false,
      ok: false,
      detail: `site smoke could not run: ${probe.error ?? 'browser did not launch'}`,
      routes: [],
      failed: [],
    };
  }
  // Launched but nothing probed (host crashed mid-run) → inconclusive, not a false RED.
  if (spec.routes.length > 0 && probe.routes.length === 0) {
    return {
      ran: false,
      ok: false,
      detail: `site smoke launched but probed no routes${probe.error ? `: ${probe.error}` : ''}`,
      routes: [],
      failed: [],
    };
  }

  const byPath = new Map(spec.routes.map((r) => [r.path, r] as const));
  const routes: RouteVerdict[] = probe.routes.map((rp) => {
    const route = byPath.get(rp.path) ?? { path: rp.path };
    return decideRoute(rp, route, spec);
  });
  const failed = routes.filter((v) => !v.ok);
  const importFails = failed.filter((v) => v.importError).length;
  const ok = failed.length === 0;
  const detail = ok
    ? `all ${routes.length} route(s) loaded + navigated clean`
    : `${failed.length}/${routes.length} route(s) failed${importFails ? ` (${importFails} import/resolve)` : ''}; first: ${failed[0].path} — ${failed[0].detail}`;
  return { ran: true, ok, detail, routes, failed };
}
