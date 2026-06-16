/** The fields describing a failed HTTP request, used to construct an `ApiError`. */
export interface ApiErrorArgs {
  /** Client/service name, so the message says *what* broke. */
  client: string;
  /** HTTP status (`0` for network/timeout failures with no response). */
  status: number;
  statusText: string;
  url: string;
  method: string;
  /** The parsed error body, when the server sent one. */
  body: unknown;
  /**
   * Machine-readable code, when known — usually parsed from the canonical error
   * envelope (`body.error.code`). Lets callers branch without string-matching.
   */
  code?: string;
}

/** A flat, log-safe view of an `ApiError` for diagnostics capture. */
export interface ApiErrorDiagnostic {
  client: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  code?: string;
  body: unknown;
}

/**
 * Thrown for any non-2xx HTTP response (and for network/timeout failures, where
 * `status` is `0`). The message is a single readable line —
 * `[service] GET https://… → 404 Not Found — {body snippet}` — so a failure is
 * useful straight from a stack trace, while the structured fields stay available
 * for programmatic handling. This is the one typed error the request layers
 * throw on failure (see `isApiError`); it understands the canonical error
 * envelope (`{ error: { code, message, … } }`) when extracting a code/message.
 *
 * Dependency-free and carries no redaction of its own: the body is attached as
 * `err.body` and the caller decides what's safe to log.
 */
export class ApiError extends Error {
  readonly client: string;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
  /** Machine-readable code, when known (e.g. from `body.error.code`). */
  readonly code?: string;

  constructor(args: ApiErrorArgs) {
    super(
      `[${args.client}] ${args.method} ${args.url} → ${args.status} ${args.statusText}${ApiError.snippet(args.body)}`,
    );
    this.name = 'ApiError';
    this.client = args.client;
    this.status = args.status;
    this.statusText = args.statusText;
    this.url = args.url;
    this.method = args.method;
    this.body = args.body;
    this.code = args.code ?? ApiError.codeFromBody(args.body);
  }

  /** A short, single-line preview of the error body for the message. */
  private static snippet(body: unknown): string {
    if (body == null || body === '') {
      return '';
    }
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    const oneLine = text.replace(/\s+/g, ' ').trim();
    if (!oneLine) {
      return '';
    }
    return ` — ${oneLine.length > 200 ? `${oneLine.slice(0, 200)}…` : oneLine}`;
  }

  /** Pull `error.code` (canonical envelope) or a top-level `code` from a parsed body. */
  private static codeFromBody(body: unknown): string | undefined {
    if (body && typeof body === 'object') {
      const envelope = (body as { error?: { code?: unknown } }).error;
      if (envelope && typeof envelope.code === 'string') {
        return envelope.code;
      }
      const top = (body as { code?: unknown }).code;
      if (typeof top === 'string') {
        return top;
      }
    }
    return undefined;
  }

  /**
   * Best human-readable message from the response body, walking the common API
   * error shapes (canonical `error.message` first, then `message`, `error`,
   * `errors[0].message`/`.detail`, or a bare string). Falls back to this error's
   * own one-line message when the body yields nothing.
   */
  extractMessage(): string {
    const found = ApiError.messageFromBody(this.body);
    return found ?? this.message;
  }

  private static messageFromBody(body: unknown): string | null {
    if (typeof body === 'string') {
      return body.trim() || null;
    }
    if (!body || typeof body !== 'object') {
      return null;
    }
    const b = body as Record<string, any>;
    const candidates = [
      b.error?.message, // canonical envelope
      b.message,
      typeof b.error === 'string' ? b.error : b.error?.message,
      b.errors?.[0]?.message,
      b.errors?.[0]?.detail,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        return c;
      }
    }
    return null;
  }

  /** A real HTTP error came back (status ≥ 400) — as opposed to a network/timeout failure. */
  isHttpError(): boolean {
    return this.status >= 400;
  }

  /** 4xx — the request was rejected (client's fault). */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** 5xx — the server failed. */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /** A flat, structured view for diagnostics capture (body left for the caller to redact). */
  toDiagnostic(): ApiErrorDiagnostic {
    return {
      client: this.client,
      method: this.method,
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      ...(this.code !== undefined && { code: this.code }),
      body: this.body,
    };
  }
}

/** Type guard for `ApiError` (the thrown request-failure error). */
export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;
