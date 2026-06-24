/**
 * A stable "signature" for a server error so identical failures collapse into one
 * group. Shared by two consumers that must agree on what "the same error" means:
 *   - the admin error monitor (count occurrences of the same bug over a window), and
 *   - the auto-debug-task capture (dedupe so a recurring error doesn't spawn a
 *     duplicate task — see {@link import('../../services/taskq/captureError')}).
 *
 * Volatile path segments (numeric ids, uuids, long hex/tokens) and volatile message
 * bits (numbers, quoted literals, uuids) are collapsed, so the same bug hit at
 * `/x/1` and `/x/2` shares one signature. Pure + zero-dependency (cwip layer): both
 * apps build on this single normalizer instead of each hand-rolling — and drifting
 * on — their own copy.
 */

export interface ErrorSignatureInput {
  name?: string | null;
  message?: string | null;
  method?: string | null;
  url?: string | null;
  status?: number | null;
}

export interface ErrorSignature {
  /** The grouping key: `name|message|METHOD route|status`. */
  signature: string;
  /** Error name (or `HTTP <status>` for a bare 5xx). */
  name: string;
  /** Normalized (volatile bits collapsed) message. */
  message: string;
  method: string;
  /** Normalized (ids collapsed) route. */
  route: string;
  status: number | null;
}

/**
 * Collapse volatile path segments (numeric ids, uuids, long hex/tokens) so the same
 * endpoint groups together regardless of which record errored. `/notes/42` and
 * `/notes/<uuid>` both normalize to `/notes/:id`.
 */
export function normalizeErrorUrl(url: string | null | undefined): string {
  const path = String(url || '').split('?')[0];
  const segs = path
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (/^\d+$/.test(seg)) return ':id';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg)) return ':id';
      if (/^[0-9a-f]{16,}$/i.test(seg)) return ':id';
      if (seg.length >= 24) return ':id';
      return seg;
    });
  return segs.length ? `/${segs.join('/')}` : '/';
}

/**
 * Collapse volatile bits of a message (uuids, standalone numbers, quoted values) so
 * near-identical errors share one signature, and cap the length so a huge message
 * can't bloat the key.
 */
export function normalizeErrorMessage(msg: string | null | undefined): string {
  return String(msg || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/'[^']*'|"[^"]*"/g, '<v>')
    .trim()
    .slice(0, 200);
}

/**
 * Build the {@link ErrorSignature} for an error. A missing name falls back to
 * `HTTP <status>` for a 5xx (so unnamed crashes still group by endpoint+status) or
 * a plain `Error` otherwise.
 */
export function errorSignature(input: ErrorSignatureInput): ErrorSignature {
  const status = input.status ?? null;
  const name = input.name?.trim() || (status && status >= 500 ? `HTTP ${status}` : 'Error');
  const message = normalizeErrorMessage(input.message);
  const method = (input.method || '').trim().toUpperCase();
  const route = normalizeErrorUrl(input.url);
  const signature = `${name}|${message}|${method} ${route}|${status ?? ''}`;
  return { signature, name, message, method, route, status };
}
