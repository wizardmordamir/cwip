/**
 * Capture — a debugging primitive for recording what an operation sent, what it
 * got back, how long it took, and how it failed. The classic use is "I'm hitting
 * an API I'm building; save every request/response (and the error when it blows
 * up) so I can inspect it." But the shape is deliberately generic: a "request"
 * and a "response" describe a DB query, a queue publish, an RPC, or any async
 * call equally well. `captureFetch`/`captureQuery` are thin specializations over
 * `captureCall`; persistence is an injected `sink` so the core stays pure.
 */

/** A serialized error: always `name`/`message`, plus `stack` and any extra fields. */
export interface CapturedError {
  name: string;
  message: string;
  stack?: string;
  [key: string]: unknown;
}

/** One captured operation — its input, output, timing, and outcome. */
export interface CaptureRecord<Req = unknown, Res = unknown> {
  /** Groups related captures (e.g. the test/endpoint name); the file sink uses it as a filename. */
  label: string;
  /** What kind of operation this is — `'fetch'`, `'db'`, or any caller tag. */
  kind?: string;
  description?: string;
  /** ISO-8601 capture time. */
  timestamp: string;
  /** Wall-clock duration of the operation in milliseconds. */
  durationMs: number;
  /** What was sent (URL+method+body, SQL+params, …). */
  request: Req;
  /** What came back, on success. */
  response?: Res;
  /** The serialized error, on failure. */
  error?: CapturedError;
  /** Arbitrary extra context to store alongside the record. */
  meta?: Record<string, unknown>;
}

/** Receives each completed capture; typically persists it (see `fileCaptureSink`). */
export type CaptureSink = (record: CaptureRecord) => void | Promise<void>;

export interface CaptureOptions<T, Req = unknown, Res = unknown> {
  label: string;
  kind?: string;
  description?: string;
  /** A snapshot of what's being sent, stored verbatim on the record. */
  request: Req;
  /** Where to send the finished record. Omit to capture nothing (a no-op passthrough). */
  sink?: CaptureSink;
  meta?: Record<string, unknown>;
  /** Map the operation's result into the stored `response` (e.g. read a Response body). Defaults to identity. */
  toResponse?: (result: T) => Res | Promise<Res>;
  /** Map a thrown value into the stored error. Defaults to `toCapturedError`. */
  toError?: (err: unknown) => CapturedError;
  /** Injectable monotonic clock in ms (default `performance.now`), for deterministic tests. */
  clock?: () => number;
  /** Injectable ISO timestamp (default `() => new Date().toISOString()`), for deterministic tests. */
  now?: () => string;
  /**
   * When `true` (the default), a thrown error is captured *and re-thrown* so the
   * caller's control flow is unchanged. Set `false` to swallow it — the capture
   * is still written and `captureCall` resolves to `undefined`.
   */
  rethrow?: boolean;
}

/** Default error serializer: pulls `name`/`message`/`stack` plus own-enumerable extras. */
export const toCapturedError = (err: unknown): CapturedError => {
  if (err instanceof Error) {
    const extras: Record<string, unknown> = {};
    for (const key of Object.keys(err)) {
      extras[key] = (err as unknown as Record<string, unknown>)[key];
    }
    return { name: err.name, message: err.message, stack: err.stack, ...extras };
  }
  return { name: 'NonError', message: typeof err === 'string' ? err : JSON.stringify(err), value: err };
};

/**
 * Run `operation`, recording a `CaptureRecord` (request, response/error, timing)
 * and handing it to `opts.sink`. Returns the operation's result; by default a
 * thrown error is captured and re-thrown, so wrapping a call in `captureCall`
 * never changes its behavior — it only observes it.
 *
 *   const rows = await captureCall(() => db.query(sql, params), {
 *     label: 'list-users', kind: 'db', request: { sql, params }, sink,
 *   });
 */
export const captureCall = async <T, Req = unknown, Res = unknown>(
  operation: () => Promise<T> | T,
  opts: CaptureOptions<T, Req, Res>,
): Promise<T> => {
  const clock = opts.clock ?? (() => performance.now());
  const now = opts.now ?? (() => new Date().toISOString());
  const timestamp = now();
  const start = clock();

  const base = (): CaptureRecord<Req, Res> => ({
    label: opts.label,
    ...(opts.kind !== undefined && { kind: opts.kind }),
    ...(opts.description !== undefined && { description: opts.description }),
    timestamp,
    durationMs: clock() - start,
    request: opts.request,
    ...(opts.meta !== undefined && { meta: opts.meta }),
  });

  const emit = async (record: CaptureRecord<Req, Res>): Promise<void> => {
    if (opts.sink) {
      await opts.sink(record as CaptureRecord);
    }
  };

  try {
    const result = await operation();
    const response = opts.toResponse ? await opts.toResponse(result) : (result as unknown as Res);
    await emit({ ...base(), response });
    return result;
  } catch (err) {
    const error = (opts.toError ?? toCapturedError)(err);
    await emit({ ...base(), error });
    if (opts.rethrow === false) {
      return undefined as T;
    }
    throw err;
  }
};
