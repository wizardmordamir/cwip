import type { ReactNode } from 'react';
import type { ToastItem, ToastVariant } from './Toast';

export interface AddToastOptions {
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. `0`/negative keeps it until dismissed.
   *  Defaults to the store's `defaultDurationMs`. */
  durationMs?: number;
  /** Provide a stable id to dedupe/replace; otherwise one is generated. */
  id?: string;
}

export interface ToastStoreConfig {
  /** Default auto-dismiss duration in ms (default 4500). */
  defaultDurationMs?: number;
  /** Cap the number of visible toasts; oldest are dropped past the cap. */
  max?: number;
}

export interface ToastStore {
  /** Current toasts (a stable array reference until it changes). */
  getToasts(): ToastItem[];
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Enqueue a toast; returns its id. */
  add(message: ReactNode, options?: AddToastOptions): string;
  dismiss(id: string): void;
  clear(): void;
}

/**
 * A small, framework-agnostic toast queue: hold a list, auto-expire entries, and
 * notify subscribers. Pair with the `useToasts` hook + the `ToastList` view, or
 * drive it directly. The store owns nothing React — apps that already have a
 * store (e.g. a Redux toast slice) can keep theirs and just render `ToastList`.
 */
export const createToastStore = (config: ToastStoreConfig = {}): ToastStore => {
  const defaultDurationMs = config.defaultDurationMs ?? 4500;
  const { max } = config;

  let toasts: ToastItem[] = [];
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let seq = 0;

  const emit = () => {
    for (const l of listeners) l();
  };

  const clearTimer = (id: string) => {
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
  };

  const dismiss = (id: string) => {
    clearTimer(id);
    const next = toasts.filter((t) => t.id !== id);
    if (next.length !== toasts.length) {
      toasts = next;
      emit();
    }
  };

  const add = (message: ReactNode, options: AddToastOptions = {}): string => {
    const id = options.id ?? `toast-${++seq}`;
    // Replace any existing toast with the same id (and its pending timer).
    clearTimer(id);
    const item: ToastItem = { id, message, variant: options.variant };
    toasts = [...toasts.filter((t) => t.id !== id), item];
    if (max && toasts.length > max) {
      const overflow = toasts.slice(0, toasts.length - max);
      for (const t of overflow) clearTimer(t.id);
      toasts = toasts.slice(toasts.length - max);
    }
    const duration = options.durationMs ?? defaultDurationMs;
    if (duration > 0)
      timers.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    emit();
    return id;
  };

  const clear = () => {
    for (const id of timers.keys()) clearTimer(id);
    if (toasts.length) {
      toasts = [];
      emit();
    }
  };

  return {
    getToasts: () => toasts,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add,
    dismiss,
    clear,
  };
};
