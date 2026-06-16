export interface PendingFileOperations {
  /** Track an in-flight async write (auto-removed on settle). */
  add(op: Promise<unknown>): void;
  /** Resolve once all currently-tracked operations have settled. */
  waitForAll(): Promise<void>;
  /** Stop accepting new operations and wait for the in-flight ones — call before process exit. */
  shutdown(): Promise<void>;
  /** Number of operations still in flight. */
  size(): number;
}

/**
 * Track fire-and-forget async file writes so a test runner can flush them before
 * `process.exit`. Pair with capture sinks / report writers
 * that write without being awaited inline, so nothing is lost on a fast exit.
 *
 *   const pending = createPendingFileOperations();
 *   pending.add(writeFile(path, data));  // don't await in the hot path
 *   // …later, before exiting:
 *   await pending.shutdown();
 */
export const createPendingFileOperations = (): PendingFileOperations => {
  const inFlight = new Set<Promise<unknown>>();
  let shuttingDown = false;

  return {
    add(op) {
      if (shuttingDown) return;
      inFlight.add(op);
      void op.finally(() => inFlight.delete(op));
    },
    async waitForAll() {
      await Promise.allSettled([...inFlight]);
    },
    async shutdown() {
      shuttingDown = true;
      await Promise.allSettled([...inFlight]);
    },
    size: () => inFlight.size,
  };
};
