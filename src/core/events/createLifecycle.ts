/**
 * A typed lifecycle registry: register handlers for named events, then `run` an
 * event to invoke every handler for it *in registration order* with a typed
 * payload. Handlers may return a callback to defer side effects until after the
 * primary work commits — the canonical case is destructive DB operations, where
 * synchronous handlers do cleanup inside the transaction and the deferred
 * callbacks (notifications, socket pushes) fire only once the change is durable.
 *
 * Generalized from an app's hard-wired hook registry: the event map is a type
 * parameter (no global module state), the "after" mechanism is a generic
 * callback (no transaction assumption), and `runAfter` swallows callback errors
 * so a post-commit side effect can't undo committed work. Pass an `onAfterError`
 * to observe those failures.
 *
 *   type Events = { 'user:before-delete': { userId: string } };
 *   const lc = createLifecycle<Events>();
 *   lc.on('user:before-delete', ({ userId }) => {
 *     cleanupOrphans(userId);
 *     return () => notify(userId); // runs after commit
 *   });
 *   const after = lc.run('user:before-delete', { userId }); // inside the txn
 *   commit();
 *   lc.runAfter(after);                                     // after the txn
 */

/** A deferred side effect returned by a handler, run after the primary work commits. */
export type AfterCommit = () => void;

/**
 * `void` is allowed alongside `AfterCommit` so a handler that only does inline
 * work (no deferred callback) typechecks without an explicit `return undefined`.
 */
// biome-ignore lint/suspicious/noConfusingVoidType: void-returning handlers must be assignable
export type LifecycleHandler<P> = (payload: P) => AfterCommit | undefined | void;

export interface Lifecycle<Events extends Record<string, unknown>> {
  /** Register a handler for `event`; returns an unsubscribe function. */
  on<E extends keyof Events>(event: E, handler: LifecycleHandler<Events[E]>): () => void;
  /** Run every handler for `event` in order, returning their deferred callbacks. Propagates handler throws. */
  run<E extends keyof Events>(event: E, payload: Events[E]): AfterCommit[];
  /** Run deferred callbacks; never throws (errors go to `onAfterError`). */
  runAfter(callbacks: AfterCommit[]): void;
  /** Number of handlers registered for `event`. */
  handlerCount(event: keyof Events): number;
}

export interface LifecycleOptions {
  /** Called when an `AfterCommit` callback throws, instead of propagating. */
  onAfterError?: (error: unknown) => void;
}

export const createLifecycle = <Events extends Record<string, unknown>>(
  options: LifecycleOptions = {},
): Lifecycle<Events> => {
  const handlers = new Map<keyof Events, LifecycleHandler<unknown>[]>();

  return {
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler as LifecycleHandler<unknown>);
      handlers.set(event, list);
      return () => {
        const current = handlers.get(event);
        if (!current) {
          return;
        }
        const idx = current.indexOf(handler as LifecycleHandler<unknown>);
        if (idx !== -1) {
          current.splice(idx, 1);
        }
      };
    },
    run(event, payload) {
      const after: AfterCommit[] = [];
      for (const handler of handlers.get(event) ?? []) {
        const cb = (handler as LifecycleHandler<Events[typeof event]>)(payload);
        if (cb) {
          after.push(cb);
        }
      }
      return after;
    },
    runAfter(callbacks) {
      for (const cb of callbacks) {
        try {
          cb();
        } catch (error) {
          options.onAfterError?.(error);
        }
      }
    },
    handlerCount(event) {
      return handlers.get(event)?.length ?? 0;
    },
  };
};
