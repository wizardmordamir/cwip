import { ApiError } from './ApiError';
import { buildUrl, type QueryParams } from './buildUrl';

/** How to authenticate every request a client makes. */
export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'header'; name: string; value: string };

/**
 * How to read a response body. `'auto'` (the default) picks json/text from the
 * Content-Type header; the rest force a specific shape (e.g. `'stream'` for a
 * large download, `'arrayBuffer'` for binary).
 */
export type ResponseType = 'auto' | 'json' | 'text' | 'arrayBuffer' | 'blob' | 'stream';

export interface ApiClientConfig {
  /** Service name, surfaced in error messages so failures say what broke. */
  name: string;
  /** Base URL; request paths resolve against it (absolute URLs are used as-is). */
  baseUrl: string;
  /** Applied to every request. Defaults to no auth. */
  auth?: AuthConfig;
  /** Headers merged into every request (overridden by per-request headers). */
  defaultHeaders?: Record<string, string>;
  /** Abort a request after this many ms. Default 30_000; `0` disables. */
  timeoutMs?: number;
  /** Injectable `fetch` (for tests). Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method?: string;
  /** Query params appended to the URL; null/undefined values are skipped. */
  query?: QueryParams;
  headers?: Record<string, string>;
  /** Object bodies are JSON-encoded; strings/Blob/FormData/etc. pass through. */
  body?: unknown;
  /** Force response parsing; defaults to `'auto'` (by Content-Type). */
  responseType?: ResponseType;
  /** Override the client timeout for this call. */
  timeoutMs?: number;
  /** Caller's abort signal, combined with the timeout. */
  signal?: AbortSignal;
}

/** A parsed response plus the metadata callers often need. */
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  url: string;
}

type BodylessOptions = Omit<RequestOptions, 'method' | 'body'>;

export interface ApiClient {
  request<T = unknown>(path: string, opts?: RequestOptions): Promise<ApiResponse<T>>;
  get<T = unknown>(path: string, opts?: BodylessOptions): Promise<ApiResponse<T>>;
  post<T = unknown>(path: string, body?: unknown, opts?: BodylessOptions): Promise<ApiResponse<T>>;
  put<T = unknown>(path: string, body?: unknown, opts?: BodylessOptions): Promise<ApiResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown, opts?: BodylessOptions): Promise<ApiResponse<T>>;
  del<T = unknown>(path: string, opts?: BodylessOptions): Promise<ApiResponse<T>>;
  /** The resolved config (auth included) — handy for building sub-clients. */
  readonly config: Readonly<ApiClientConfig>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

const authHeaders = (auth: AuthConfig): Record<string, string> => {
  switch (auth.type) {
    case 'bearer':
      return { Authorization: `Bearer ${auth.token}` };
    case 'basic':
      return { Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}` };
    case 'header':
      return { [auth.name]: auth.value };
    case 'none':
      return {};
  }
};

/** Case-insensitive header presence check. */
const hasHeader = (headers: Record<string, string>, name: string): boolean => {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
};

/** Turn an arbitrary body value into a fetch `BodyInit`, JSON-encoding plain objects. */
const prepareBody = (body: unknown, headers: Record<string, string>): BodyInit | undefined => {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams ||
    body instanceof FormData ||
    body instanceof ReadableStream ||
    ArrayBuffer.isView(body)
  ) {
    return body as BodyInit;
  }
  if (!hasHeader(headers, 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  return JSON.stringify(body);
};

/** Parse a response body per the requested (or auto-detected) type. */
const parseBody = async (res: Response, type: ResponseType): Promise<unknown> => {
  switch (type) {
    case 'stream':
      return res.body;
    case 'arrayBuffer':
      return res.arrayBuffer();
    case 'blob':
      return res.blob();
    case 'text':
      return res.text();
    case 'json':
      return res.json();
    case 'auto': {
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return null;
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json') || contentType.includes('+json')) {
        return res.json();
      }
      // Everything else (text/*, xml, html, unknown) is returned as text — safest
      // for both real text payloads and for surfacing error bodies.
      return res.text();
    }
  }
};

/** Combine the caller's abort signal with a timeout into one signal. */
const resolveSignal = (timeoutMs: number, callerSignal?: AbortSignal): AbortSignal | undefined => {
  const signals: AbortSignal[] = [];
  if (callerSignal) {
    signals.push(callerSignal);
  }
  if (timeoutMs > 0) {
    signals.push(AbortSignal.timeout(timeoutMs));
  }
  if (signals.length === 0) {
    return undefined;
  }
  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
};

/**
 * Build a small, typed `fetch` wrapper that owns the boring-but-easy-to-get-wrong
 * parts of talking to an HTTP API: base-URL joining, query params, auth headers,
 * JSON encoding, content-type-aware parsing, per-request timeouts, and uniform
 * `ApiError`s tagged with the client name. `fetch` is injectable, so clients
 * built on it stay unit-testable without hitting the network.
 *
 *   const gh = createApiClient({ name: 'github', baseUrl: 'https://api.github.com',
 *     auth: { type: 'bearer', token } });
 *   const { data } = await gh.get<Repo>('/repos/owner/name');
 */
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  const auth = config.auth ?? { type: 'none' };
  const doFetch = config.fetch ?? fetch;
  const clientTimeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const request = async <T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> => {
    const method = (opts.method ?? 'GET').toUpperCase();
    const url = buildUrl(config.baseUrl, path, opts.query);

    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...authHeaders(auth),
      ...opts.headers,
    };
    const body = prepareBody(opts.body, headers);
    const timeoutMs = opts.timeoutMs ?? clientTimeout;

    let res: Response;
    try {
      res = await doFetch(url, { method, headers, body, signal: resolveSignal(timeoutMs, opts.signal) });
    } catch (err) {
      // Normalize aborts/network failures into a tagged, throwable error.
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      const reason = isTimeout
        ? `timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : 'network error';
      throw new ApiError({
        client: config.name,
        status: 0,
        statusText: isTimeout ? 'Timeout' : 'Network Error',
        url,
        method,
        body: reason,
      });
    }

    if (!res.ok) {
      const errorBody = await parseBody(res, 'auto').catch(() => null);
      throw new ApiError({
        client: config.name,
        status: res.status,
        statusText: res.statusText,
        url,
        method,
        body: errorBody,
      });
    }

    const data = (await parseBody(res, opts.responseType ?? 'auto')) as T;
    return { data, status: res.status, headers: res.headers, url };
  };

  const withBody =
    (method: string) =>
    <T = unknown>(path: string, body?: unknown, opts: BodylessOptions = {}) =>
      request<T>(path, { ...opts, method, body });

  const withoutBody =
    (method: string) =>
    <T = unknown>(path: string, opts: BodylessOptions = {}) =>
      request<T>(path, { ...opts, method });

  return {
    request,
    get: withoutBody('GET'),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    del: withoutBody('DELETE'),
    config: Object.freeze({ ...config, auth }),
  };
};
