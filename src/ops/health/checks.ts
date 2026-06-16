// Composable check helpers. The thing a hardcoded health route bakes in (Mongo or
// auth pings wired straight into the route) becomes a one-liner here: wrap any throwing probe
// — a DB ping, an HTTP call — into a rich HealthCheck. No driver coupling: the
// app supplies the probe.

import type { HealthCheck, HealthSeverity } from './types';

export interface ProbeCheckOptions {
  id: string;
  title: string;
  /** Grouping label (default "Dependencies"). */
  category?: string;
  /** Status raised when the probe fails (default "error"). */
  severity?: HealthSeverity;
  /** Detail shown when the probe succeeds (default "Reachable."). */
  okDetail?: string;
  /** Remediation steps shown when the probe fails. */
  remediation?: string[];
  /** The probe: resolves/returns when healthy, throws/rejects when not. */
  probe: () => void | Promise<void>;
}

/**
 * Turn a throwing/rejecting probe into a {@link HealthCheck}.
 *
 *   registry.register(probeCheck({
 *     id: 'mongo', title: 'MongoDB',
 *     probe: () => db.command({ ping: 1 }),
 *   }));
 */
export const probeCheck = (options: ProbeCheckOptions): HealthCheck => {
  const {
    id,
    title,
    category = 'Dependencies',
    severity = 'error',
    okDetail = 'Reachable.',
    remediation = [],
    probe,
  } = options;
  return async () => {
    try {
      await probe();
      return { id, title, category, severity, status: 'ok', detail: okDetail, remediation: [] };
    } catch (err) {
      return {
        id,
        title,
        category,
        severity,
        status: severity,
        detail: err instanceof Error ? err.message : String(err),
        remediation,
      };
    }
  };
};

export interface HttpProbeOptions {
  /** Abort the request after this many ms (no timeout when omitted). */
  timeoutMs?: number;
  /** Explicit acceptable statuses; defaults to any 2xx (`response.ok`). */
  okStatuses?: number[];
  /** Passed through to fetch (method, headers, …). */
  init?: RequestInit;
}

/**
 * Build a probe that requests `url` and throws unless the response is acceptable.
 * Uses the global `fetch` (no dependency). Pair with {@link probeCheck}.
 *
 *   probeCheck({ id: 'api', title: 'Upstream API', probe: httpProbe('https://x/health', { timeoutMs: 3000 }) });
 */
export const httpProbe =
  (url: string, options: HttpProbeOptions = {}): (() => Promise<void>) =>
  async () => {
    const controller = options.timeoutMs ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;
    try {
      const res = await fetch(url, { ...options.init, signal: controller?.signal });
      const ok = options.okStatuses ? options.okStatuses.includes(res.status) : res.ok;
      if (!ok) throw new Error(`${url} responded with status ${res.status}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
