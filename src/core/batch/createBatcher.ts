/**
 * Buffer items and flush them in batches — on a size threshold, on a time
 * interval, or explicitly. The classic use is "record one row per request but
 * write to the DB once every ~1.5s" without touching the hot path. Generalized
 * from an app's metrics buffer into a standalone primitive: the flush target is
 * an injected `onFlush(items)`, so it works for DB inserts, log shipping, event
 * batching, anything. Browser-safe (array + timer), hence the package root.
 *
 *   const batcher = createBatcher<Row>({
 *     onFlush: (rows) => db.insertMany(rows),
 *     maxSize: 5000,        // flush eagerly if the buffer hits this
 *     intervalMs: 1500,     // and/or on this cadence
 *   });
 *   batcher.add(row);
 *   await batcher.stop();   // flush remaining + clear the timer (on shutdown)
 */
export interface BatcherOptions<T> {
  /** Called with a non-empty batch. May be async; rejections go to `onError`. */
  onFlush: (items: T[]) => void | Promise<void>;
  /** Flush automatically once the buffer reaches this many items. */
  maxSize?: number;
  /** Flush on this interval (ms) regardless of size. Omitted = size/explicit only. */
  intervalMs?: number;
  /** Observe a failing `onFlush` (the batch is dropped after failure). */
  onError?: (error: unknown, items: T[]) => void;
}

export interface Batcher<T> {
  /** Enqueue an item, flushing eagerly if `maxSize` is reached. */
  add(item: T): void;
  /** Enqueue several items. */
  addMany(items: T[]): void;
  /** Flush the current buffer now (no-op when empty). Resolves once `onFlush` settles. */
  flush(): Promise<void>;
  /** Number of buffered (not-yet-flushed) items. */
  readonly size: number;
  /** Flush remaining items and stop the interval timer. Call on shutdown. */
  stop(): Promise<void>;
}

export const createBatcher = <T>(options: BatcherOptions<T>): Batcher<T> => {
  const { onFlush, maxSize, intervalMs, onError } = options;
  let buffer: T[] = [];

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) {
      return;
    }
    const batch = buffer;
    buffer = [];
    try {
      await onFlush(batch);
    } catch (error) {
      onError?.(error, batch);
    }
  };

  let timer: ReturnType<typeof setInterval> | undefined;
  if (intervalMs && intervalMs > 0) {
    timer = setInterval(() => {
      void flush();
    }, intervalMs);
    (timer as { unref?: () => void })?.unref?.();
  }

  return {
    add(item) {
      buffer.push(item);
      if (maxSize && buffer.length >= maxSize) {
        void flush();
      }
    },
    addMany(items) {
      for (const item of items) {
        this.add(item);
      }
    },
    flush,
    get size() {
      return buffer.length;
    },
    async stop() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      await flush();
    },
  };
};
