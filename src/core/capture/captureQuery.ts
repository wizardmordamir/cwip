import { type CaptureSink, captureCall } from './captureCall';

export interface CaptureQueryOptions {
  /** Groups related captures (the file sink uses it as a filename). */
  label: string;
  /** The query text (SQL, a Mongo command description, a GraphQL document, …). */
  sql: string;
  /** Bound parameters / arguments, stored verbatim on the record. */
  params?: unknown;
  description?: string;
  /** Where to persist the capture; omit for a transparent passthrough. */
  sink?: CaptureSink;
  meta?: Record<string, unknown>;
  clock?: () => number;
  now?: () => string;
}

/** A serializable snapshot of a database query. */
export interface CapturedQuery {
  sql: string;
  params?: unknown;
}

/**
 * Run a database query and capture it (text + params + result/error + timing) via
 * a `sink` — the DB sibling of `captureFetch`, both thin wrappers over
 * `captureCall`. Drop it around a query while building/debugging to accumulate an
 * inspectable log of exactly what ran and what came back.
 *
 *   const rows = await captureQuery(() => db.query(sql, params), {
 *     label: 'list-users', sql, params, sink: fileCaptureSink('./__captures'),
 *   });
 *
 * Returns the query's raw result and re-throws on error (the capture is written
 * either way), so wrapping a query never changes its behavior.
 */
export const captureQuery = <T>(run: () => Promise<T> | T, opts: CaptureQueryOptions): Promise<T> => {
  const request: CapturedQuery = { sql: opts.sql, ...(opts.params !== undefined && { params: opts.params }) };
  return captureCall<T, CapturedQuery, T>(run, {
    label: opts.label,
    kind: 'db',
    ...(opts.description !== undefined && { description: opts.description }),
    request,
    sink: opts.sink,
    ...(opts.meta !== undefined && { meta: opts.meta }),
    ...(opts.clock !== undefined && { clock: opts.clock }),
    ...(opts.now !== undefined && { now: opts.now }),
  });
};
