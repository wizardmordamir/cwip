import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CaptureRecord, CaptureSink } from '../../../core/capture';

export interface FileCaptureSinkOptions {
  /** Pretty-print the JSON (default `true`). */
  pretty?: boolean;
  /**
   * Keys to redact (recursively, case-insensitive) in each record before it's
   * written — strip PII from captured request/response data so the saved file is
   * safe to commit and reuse as a mock fixture. Replaced with `mask`.
   */
  redactKeys?: string[];
  /** Replacement for redacted values (default `'[REDACTED]'`). */
  mask?: unknown;
  /** Final transform before writing (anonymize, trim, reshape) — runs after redaction. */
  sanitize?: (record: CaptureRecord) => CaptureRecord;
}

/** Make a label safe to use as a filename (no separators, no traversal). */
const safeName = (label: string): string => {
  const cleaned = label.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '');
  return cleaned || 'capture';
};

// Recursively replace any value whose key matches (case-insensitive) with `mask`.
const redactDeep = (value: unknown, keySet: Set<string>, mask: unknown): unknown => {
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, keySet, mask));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = keySet.has(k.toLowerCase()) ? mask : redactDeep(v, keySet, mask);
    }
    return out;
  }
  return value;
};

const prepareRecord = (record: CaptureRecord, options: FileCaptureSinkOptions): CaptureRecord => {
  let out = record;
  if (options.redactKeys?.length) {
    const keySet = new Set(options.redactKeys.map((k) => k.toLowerCase()));
    out = redactDeep(out, keySet, options.mask ?? '[REDACTED]') as CaptureRecord;
  }
  return options.sanitize ? options.sanitize(out) : out;
};

// Serialize writes per file so concurrent captures to the same label can't lose
// records to an interleaved read-modify-write (a bug in the harness this came from).
const fileQueues = new Map<string, Promise<unknown>>();

const enqueue = <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const prev = fileQueues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  fileQueues.set(
    key,
    next.catch(() => {}),
  );
  return next;
};

/**
 * A `CaptureSink` that appends each record to `<dir>/<label>.json` as a growing
 * JSON array — point `captureFetch`/`captureCall` at it to accumulate every
 * request/response (and error) for a given label into one inspectable file.
 * Directories are created on demand; same-label writes are serialized so nothing
 * is dropped under concurrency.
 *
 *   const sink = fileCaptureSink('./__captures');
 *   await captureFetch(url, init, { label: 'create-user', sink });
 *   // → ./__captures/create-user.json  (array of capture records)
 */
export const fileCaptureSink = (dir: string, options: FileCaptureSinkOptions = {}): CaptureSink => {
  const pretty = options.pretty ?? true;
  return (record: CaptureRecord): Promise<void> => {
    const prepared = prepareRecord(record, options);
    const file = path.join(dir, `${safeName(prepared.label)}.json`);
    return enqueue(file, async () => {
      await mkdir(dir, { recursive: true });
      let existing: CaptureRecord[] = [];
      try {
        const parsed = JSON.parse(await readFile(file, 'utf8'));
        existing = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // new or unreadable file — start fresh
      }
      existing.push(prepared);
      await writeFile(file, JSON.stringify(existing, null, pretty ? 2 : undefined));
    });
  };
};
