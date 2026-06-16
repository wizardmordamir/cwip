export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface HttpResponse<T = any> {
  status: number;
  ok: boolean;
  headers: Headers;
  /** Parsed JSON when the body is JSON, otherwise the raw text. */
  body: T;
  /** The raw response text (always populated). */
  text: string;
  /** The underlying Response, for streaming/blob cases. */
  raw: Response;
}

export interface HttpTestClientOptions {
  baseUrl: string;
  /** Default headers applied to every request (e.g. auth cookie). */
  headers?: Record<string, string>;
  /** Inject a fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Default ms before a request aborts. Default 15000. 0 disables the timeout. */
  timeoutMs?: number;
}

/**
 * A network-level error with the request context attached, so a failing test
 * shows *what* call blew up — not just `fetch failed`.
 */
export class HttpTestError extends Error {
  constructor(
    message: string,
    readonly detail: { method: string; url: string; cause?: unknown },
  ) {
    super(message);
    this.name = 'HttpTestError';
  }
}

export interface HttpTestClient {
  request<T = any>(method: HttpMethod, path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
  get<T = any>(path: string, init?: RequestInit): Promise<HttpResponse<T>>;
  post<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
  put<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
  patch<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
  del<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
  /** A new client with extra default headers merged over this one's. */
  withHeaders(headers: Record<string, string>): HttpTestClient;
}

const parseBody = (text: string, contentType: string | null): any => {
  if (!text) return null;
  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  // Best-effort JSON even when the server forgot the header.
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      // fall through to raw text
    }
  }
  return text;
};

/**
 * A tiny, rich HTTP client for functional tests. Never throws on a non-2xx
 * status (the test asserts on `status`); it only throws — with full context —
 * when the request itself fails (network/timeout). Parses JSON automatically
 * but always keeps the raw text around for debugging.
 */
export const makeHttpTestClient = (opts: HttpTestClientOptions): HttpTestClient => {
  const { baseUrl, headers: defaultHeaders = {}, fetchImpl = fetch, timeoutMs = 15_000 } = opts;

  const request = async <T = any>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    init: RequestInit = {},
  ): Promise<HttpResponse<T>> => {
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const headers: Record<string, string> = { ...defaultHeaders, ...((init.headers as Record<string, string>) ?? {}) };

    let payload = init.body;
    if (body !== undefined && payload === undefined) {
      if (body instanceof FormData || body instanceof URLSearchParams || typeof body === 'string') {
        payload = body as BodyInit;
      } else {
        payload = JSON.stringify(body);
        if (!headers['content-type'] && !headers['Content-Type']) headers['content-type'] = 'application/json';
      }
    }

    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let raw: Response;
    try {
      raw = await fetchImpl(url, {
        ...init,
        method,
        headers,
        body: payload,
        signal: controller?.signal ?? init.signal,
      });
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'AbortError';
      throw new HttpTestError(
        aborted ? `${method} ${url} timed out after ${timeoutMs}ms` : `${method} ${url} failed: ${String(cause)}`,
        { method, url, cause },
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    const text = await raw.text();
    return {
      status: raw.status,
      ok: raw.ok,
      headers: raw.headers,
      body: parseBody(text, raw.headers.get('content-type')),
      text,
      raw,
    };
  };

  const client: HttpTestClient = {
    request,
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    put: (path, body, init) => request('PUT', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
    del: (path, body, init) => request('DELETE', path, body, init),
    withHeaders: (extra) => makeHttpTestClient({ ...opts, headers: { ...defaultHeaders, ...extra } }),
  };
  return client;
};
