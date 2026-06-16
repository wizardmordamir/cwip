import type { CaptureRecord, CaptureSink } from './captureCall';

export interface MemoryCaptureSink {
  /** The sink to hand to `captureCall`/`captureFetch`/`captureQuery`. */
  sink: CaptureSink;
  /** A copy of the captured records, oldest first. */
  records(): CaptureRecord[];
  /** Records for one label (the file sink's grouping), oldest first. */
  byLabel(label: string): CaptureRecord[];
  /** Drop everything captured so far. */
  clear(): void;
}

export interface MemoryCaptureSinkOptions {
  /** Keep at most this many records (ring buffer; oldest dropped). Omitted = unbounded. */
  max?: number;
}

/**
 * An in-memory `CaptureSink` — collect records in process instead of writing
 * files. Ideal for tests ("assert the third request sent X") and for a dev-time
 * ring buffer of recent calls. Pair with any `capture*` helper.
 *
 *   const cap = createMemoryCaptureSink({ max: 100 });
 *   await captureFetch(url, init, { label: 'x', sink: cap.sink });
 *   expect(cap.records()).toHaveLength(1);
 */
export const createMemoryCaptureSink = (options: MemoryCaptureSinkOptions = {}): MemoryCaptureSink => {
  const { max } = options;
  let buffer: CaptureRecord[] = [];

  return {
    sink: (record) => {
      buffer.push(record);
      if (max && max > 0 && buffer.length > max) {
        buffer = buffer.slice(buffer.length - max);
      }
    },
    records: () => [...buffer],
    byLabel: (label) => buffer.filter((r) => r.label === label),
    clear: () => {
      buffer = [];
    },
  };
};
