/**
 * A tiny, dependency-free pub/sub. `subscribe` returns an unsubscribe function;
 * `emit` delivers to every current listener. Intentionally minimal — a `Set` of
 * callbacks — so it's trivially testable and works the same in the browser, Node,
 * and Bun. For typed, named lifecycle events with collected callbacks, see
 * `createLifecycle`.
 *
 *   const bus = createEventBus<{ id: string }>();
 *   const off = bus.subscribe((e) => console.log(e.id));
 *   bus.emit({ id: 'a' });
 *   off();
 */
export interface EventBus<T> {
  /** Register a listener; returns an unsubscribe function. */
  subscribe(listener: (event: T) => void): () => void;
  /** Deliver an event to every current listener (in subscription order). */
  emit(event: T): void;
  /** Number of active listeners (handy for tests/diagnostics). */
  listenerCount(): number;
  /** Remove all listeners. */
  clear(): void;
}

export const createEventBus = <T = void>(): EventBus<T> => {
  const listeners = new Set<(event: T) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event) {
      // Iterate a snapshot so a listener that (un)subscribes during emit is safe.
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
    listenerCount() {
      return listeners.size;
    },
    clear() {
      listeners.clear();
    },
  };
};
