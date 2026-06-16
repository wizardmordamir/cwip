import type { SnResolvedCredentials } from './credentials';

// Pure ServiceNow REST client. The URL/header/normalization helpers are
// dependency-free (no DB, no HTTP framework) so they unit-test cleanly and work in
// any app (cursedalchemy, rubato). Only `executeServiceNow` touches the network, via
// an injectable fetch.

export type SnOperation = 'table_read' | 'table_write' | 'passthrough';
export type SnWriteMode = 'create' | 'update';
export type SnHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SnRequest {
  operation: SnOperation;
  // table_read
  table?: string;
  query?: string; // ServiceNow encoded query → sysparm_query
  fields?: string[]; // → sysparm_fields
  limit?: number; // → sysparm_limit
  offset?: number; // → sysparm_offset
  displayValue?: 'true' | 'false' | 'all'; // → sysparm_display_value
  // table_write
  writeMode?: SnWriteMode;
  sysId?: string; // record sys_id for an update
  body?: unknown; // record fields for create/update (also passthrough body)
  // passthrough
  method?: SnHttpMethod;
  path?: string; // e.g. /api/now/table/incident (absolute URLs also accepted)
  queryParams?: Record<string, string>;
}

export interface SnRunResult {
  ok: boolean;
  status?: number;
  /** The raw `result` payload from ServiceNow (object for one record, array for a list). */
  result?: unknown;
  /** Convenience: `result` coerced to an array of rows, when it is/contains a list. */
  rows?: Record<string, unknown>[];
  rowCount?: number;
  truncated?: boolean;
  durationMs?: number;
  error?: { code: string; message: string };
}

const MAX_CAP = 1000;
const DEFAULT_CAP = 100;

export const clampSnLimit = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : DEFAULT_CAP;
  return Math.min(Math.max(v, 1), MAX_CAP);
};

/** Trim trailing slashes so a leading-slash path can be safely concatenated. */
export const normalizeBaseUrl = (raw: string): string => raw.trim().replace(/\/+$/, '');

export const buildAuthHeader = (creds: SnResolvedCredentials): string => {
  if (creds.authKind === 'bearer' && creds.token) return `Bearer ${creds.token}`;
  if (creds.authKind === 'basic' && creds.password) {
    const pair = `${creds.username ?? ''}:${creds.password}`;
    // btoa-free base64 (works in node/Bun without Buffer typing friction).
    const b64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(pair, 'utf8').toString('base64')
        : btoa(unescape(encodeURIComponent(pair)));
    return `Basic ${b64}`;
  }
  return '';
};

const appendParams = (search: URLSearchParams, params: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, v);
  }
};

/**
 * Resolve a request + base URL into a concrete { method, url, sendBody } call. Pure —
 * throws a plain Error for structural problems (missing table/path/sysId) so the
 * caller can map it to a 400.
 */
export const resolveSnCall = (
  baseUrl: string,
  req: SnRequest,
  cap: number,
): { method: SnHttpMethod; url: string; sendBody: boolean } => {
  const base = normalizeBaseUrl(baseUrl);

  if (req.operation === 'table_read') {
    if (!req.table?.trim()) throw new Error('A table is required for a table read');
    const url = new URL(`${base}/api/now/table/${encodeURIComponent(req.table.trim())}`);
    appendParams(url.searchParams, {
      sysparm_query: req.query?.trim() || undefined,
      sysparm_fields: req.fields?.length ? req.fields.join(',') : undefined,
      sysparm_limit: String(clampSnLimit(req.limit ?? cap)),
      sysparm_offset: req.offset ? String(Math.max(0, Math.floor(req.offset))) : undefined,
      sysparm_display_value: req.displayValue,
    });
    return { method: 'GET', url: url.toString(), sendBody: false };
  }

  if (req.operation === 'table_write') {
    if (!req.table?.trim()) throw new Error('A table is required for a table write');
    const mode: SnWriteMode = req.writeMode === 'update' ? 'update' : 'create';
    const table = encodeURIComponent(req.table.trim());
    if (mode === 'update') {
      if (!req.sysId?.trim()) throw new Error('A sys_id is required to update a record');
      return {
        method: 'PATCH',
        url: `${base}/api/now/table/${table}/${encodeURIComponent(req.sysId.trim())}`,
        sendBody: true,
      };
    }
    return { method: 'POST', url: `${base}/api/now/table/${table}`, sendBody: true };
  }

  // passthrough — call any ServiceNow REST endpoint with the connection's auth.
  const method = (req.method ?? 'GET').toUpperCase() as SnHttpMethod;
  const rawPath = req.path?.trim();
  if (!rawPath) throw new Error('A path is required for a passthrough request');
  const isAbsolute = /^https?:\/\//i.test(rawPath);
  const url = new URL(isAbsolute ? rawPath : `${base}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`);
  if (req.queryParams) appendParams(url.searchParams, req.queryParams);
  return { method, url: url.toString(), sendBody: method !== 'GET' && method !== 'DELETE' };
};

/** ServiceNow wraps success in `{ result }` and errors in `{ error: { message, detail } }`. */
export const normalizeSnResponse = (status: number, json: any, durationMs: number): SnRunResult => {
  if (status < 200 || status >= 300) {
    const msg =
      json?.error?.message ||
      json?.error?.detail ||
      (typeof json === 'string' ? json : `ServiceNow returned HTTP ${status}`);
    return { ok: false, status, durationMs, error: { code: `HTTP_${status}`, message: msg } };
  }
  const result = json?.result;
  const rows = Array.isArray(result)
    ? (result as Record<string, unknown>[])
    : result && typeof result === 'object'
      ? [result as Record<string, unknown>]
      : [];
  return { ok: true, status, result, rows, rowCount: rows.length, durationMs };
};

export interface ExecuteSnArgs {
  baseUrl: string;
  creds: SnResolvedCredentials;
  request: SnRequest;
  cap: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export const executeServiceNow = async ({
  baseUrl,
  creds,
  request,
  cap,
  fetchImpl = fetch,
  now = () => Date.now(),
}: ExecuteSnArgs): Promise<SnRunResult> => {
  const { method, url, sendBody } = resolveSnCall(baseUrl, request, cap);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: buildAuthHeader(creds),
  };
  let init: RequestInit = { method, headers };
  if (sendBody) {
    headers['Content-Type'] = 'application/json';
    init = { ...init, body: JSON.stringify(request.body ?? {}) };
  }

  const start = now();
  const res = await fetchImpl(url, init);
  const durationMs = now() - start;
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = text;
  }
  return normalizeSnResponse(res.status, json, durationMs);
};
