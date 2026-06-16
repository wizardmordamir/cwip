import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { type AddToastOptions, createToastStore, type ToastStore } from './toastStore';

// A lazily-created default store, so `useToasts()` works with zero setup. Pass an
// explicit store to scope toasts (e.g. tests, or multiple independent stacks).
let defaultStore: ToastStore | undefined;
const getDefaultStore = (): ToastStore => (defaultStore ??= createToastStore());

export interface UseToastsResult {
  toasts: ReturnType<ToastStore['getToasts']>;
  add: ToastStore['add'];
  dismiss: ToastStore['dismiss'];
  clear: ToastStore['clear'];
  info: (message: ReactNode, options?: Omit<AddToastOptions, 'variant'>) => string;
  success: (message: ReactNode, options?: Omit<AddToastOptions, 'variant'>) => string;
  warning: (message: ReactNode, options?: Omit<AddToastOptions, 'variant'>) => string;
  error: (message: ReactNode, options?: Omit<AddToastOptions, 'variant'>) => string;
}

/**
 * Subscribe to a {@link ToastStore} and get ergonomic enqueue helpers. Render
 * `toasts` with `<ToastList toasts={toasts} onDismiss={dismiss} />`.
 *
 *   const { success, error } = useToasts();
 *   success('Saved'); error('Could not save');
 */
export const useToasts = (store: ToastStore = getDefaultStore()): UseToastsResult => {
  const toasts = useSyncExternalStore(store.subscribe, store.getToasts, store.getToasts);
  const variant = (v: AddToastOptions['variant']) => (message: ReactNode, options?: Omit<AddToastOptions, 'variant'>) =>
    store.add(message, { ...options, variant: v });
  return {
    toasts,
    add: store.add,
    dismiss: store.dismiss,
    clear: store.clear,
    info: variant('info'),
    success: variant('success'),
    warning: variant('warning'),
    error: variant('error'),
  };
};
