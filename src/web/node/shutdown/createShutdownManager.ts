/**
 * Graceful-shutdown coordinator: register cleanup callbacks, then run them all
 * exactly once when the process receives a termination signal (or you call
 * `shutdown()`). Generalized from app-local shutdown singletons — no global
 * logger, no app-specific cleanups baked in. Callbacks run concurrently with a
 * bounded timeout so a hung cleanup can't wedge the process forever; failures
 * are reported via `onError` instead of being swallowed or aborting the rest.
 *
 *   const shutdown = createShutdownManager({ timeoutMs: 10_000 });
 *   shutdown.register(() => server.close());
 *   shutdown.register(() => db.disconnect());
 *   shutdown.listen(); // install SIGTERM/SIGINT handlers
 */
export type ShutdownCallback = () => unknown | Promise<unknown>;

export interface ShutdownManagerOptions {
  /** Max ms to wait for all callbacks before resolving anyway (default 10_000; `0` = no limit). */
  timeoutMs?: number;
  /** Signals to handle when `listen()` is called (default `['SIGTERM', 'SIGINT']`). */
  signals?: NodeJS.Signals[];
  /** Observe a callback that throws/rejects (others still run). */
  onError?: (error: unknown) => void;
}

export interface ShutdownManager {
  /** Register a cleanup callback; returns an unregister function. */
  register(callback: ShutdownCallback): () => void;
  /** Run every callback once (concurrently, bounded by `timeoutMs`). Idempotent. */
  shutdown(): Promise<void>;
  /** Install one-shot signal handlers that call `shutdown()`. Returns a remover. */
  listen(): () => void;
  /** Whether shutdown has started. */
  readonly isShuttingDown: boolean;
}

export const createShutdownManager = (options: ShutdownManagerOptions = {}): ShutdownManager => {
  const { timeoutMs = 10_000, onError } = options;
  const signals = options.signals ?? (['SIGTERM', 'SIGINT'] as NodeJS.Signals[]);
  const callbacks = new Set<ShutdownCallback>();
  let shuttingDown = false;
  let pending: Promise<void> | null = null;

  const runAll = async (): Promise<void> => {
    const all = Promise.all(
      [...callbacks].map(async (cb) => {
        try {
          await cb();
        } catch (error) {
          onError?.(error);
        }
      }),
    ).then(() => undefined);

    if (timeoutMs > 0) {
      await Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs).unref?.())]);
    } else {
      await all;
    }
    callbacks.clear();
  };

  return {
    register(callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    shutdown() {
      if (!pending) {
        shuttingDown = true;
        pending = runAll();
      }
      return pending;
    },
    listen() {
      const handlers = signals.map((signal): [NodeJS.Signals, () => void] => {
        const handler = () => {
          void this.shutdown();
        };
        process.once(signal, handler);
        return [signal, handler];
      });
      return () => {
        for (const [signal, handler] of handlers) {
          process.removeListener(signal, handler);
        }
      };
    },
    get isShuttingDown() {
      return shuttingDown;
    },
  };
};
