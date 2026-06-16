import { type CaptureSink, captureCall } from './captureCall';

/** A serializable snapshot of an outgoing request. */
export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** A serializable snapshot of a response (body read as text, capped). */
export interface CapturedResponse {
  status: number;
  statusText: string;
  ok: boolean;
  redirected: boolean;
  url: string;
  headers: Record<string, string>;
  /** Response body as text (parsed JSON also surfaced on `json` when applicable). */
  bodyText: string;
  json?: unknown;
}

export interface CaptureFetchOptions {
  /** Groups related captures (the file sink uses it as a filename). */
  label: string;
  description?: string;
  /** Where to persist the capture; omit to make this a transparent passthrough. */
  sink?: CaptureSink;
  /** Injectable `fetch` (for tests). Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  meta?: Record<string, unknown>;
  /** Cap the stored response/request body length in chars (default 100_000; `0` = unlimited). */
  maxBodyChars?: number;
  clock?: () => number;
  now?: () => string;
}

const DEFAULT_MAX_BODY = 100_000;

const headersToObject = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};

const cap = (text: string, max: number): string =>
  max > 0 && text.length > max ? `${text.slice(0, max)}…[truncated]` : text;

const bodyToText = (body: BodyInit | null | undefined): string | undefined => {
  if (body == null) {
    return undefined;
  }
  return typeof body === 'string' ? body : '[non-string body]';
};

/**
 * Perform a `fetch` and capture the full request/response (and any error) via a
 * `sink` — the "hit an API I'm building and save what it returns" helper. The
 * response is **cloned** before its body is read, so the `Response` you get back
 * is untouched and fully readable. The request, response (status, headers, body
 * text, parsed JSON when applicable), timing, and errors are all recorded.
 *
 *   const res = await captureFetch('https://api.local/users', { method: 'POST', body },
 *     { label: 'create-user', sink: fileCaptureSink('./__captures') });
 *   const user = await res.json(); // body still readable
 *
 * Capturing is best-effort: a failing/blocked sink never breaks the fetch.
 */
export const captureFetch = (
  input: string | URL,
  init: RequestInit = {},
  opts: CaptureFetchOptions,
): Promise<Response> => {
  const doFetch = opts.fetch ?? fetch;
  const max = opts.maxBodyChars ?? DEFAULT_MAX_BODY;
  const url = typeof input === 'string' ? input : input.toString();

  const request: CapturedRequest = {
    url,
    method: (init.method ?? 'GET').toUpperCase(),
    headers: init.headers ? headersToObject(new Headers(init.headers)) : {},
    ...(bodyToText(init.body) !== undefined && { body: cap(bodyToText(init.body) as string, max) }),
  };

  return captureCall<Response, CapturedRequest, CapturedResponse>(() => doFetch(input, init), {
    label: opts.label,
    kind: 'fetch',
    ...(opts.description !== undefined && { description: opts.description }),
    request,
    sink: opts.sink,
    ...(opts.meta !== undefined && { meta: opts.meta }),
    ...(opts.clock !== undefined && { clock: opts.clock }),
    ...(opts.now !== undefined && { now: opts.now }),
    toResponse: async (res) => {
      const bodyText = cap(await res.clone().text(), max);
      let json: unknown;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('json')) {
        try {
          json = JSON.parse(bodyText);
        } catch {
          // leave json undefined for non-JSON bodies mislabeled as json
        }
      }
      return {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        redirected: res.redirected,
        url: res.url || url,
        headers: headersToObject(res.headers),
        bodyText,
        ...(json !== undefined && { json }),
      };
    },
  });
};
