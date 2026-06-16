import type { CSSProperties, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from './styling';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: ReactNode;
  variant?: ToastVariant;
}

/** The styleable slots of a single toast. */
export type ToastSlot = 'root' | 'message' | 'dismiss';

export interface ToastProps extends StyleableProps<ToastSlot> {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

// The accent (left border) per variant — Tailwind classes so they theme/dark-mode
// with the host app. The rest of the surface is neutral + dark-aware.
const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-blue-500',
  success: 'border-green-600',
  warning: 'border-amber-600',
  error: 'border-red-600',
};

const ROOT_CLASS =
  'flex items-center gap-2 rounded-md border-l-4 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-md dark:bg-gray-800 dark:text-gray-100';
const DISMISS_CLASS =
  'cursor-pointer border-0 bg-transparent text-base leading-none text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';

/**
 * A single, store-agnostic toast — bring your own list + `onDismiss`. Tailwind-
 * first, variant-colored, accessible (`role="status"`). Overridable per slot
 * (`root`, `message`, `dismiss`) via `classNames`/`styles`/`unstyled`. Width is
 * an inline structural default so it stays sane without a stylesheet.
 */
export const Toast = ({ toast, onDismiss, classNames, styles, unstyled }: ToastProps) => {
  const variant = toast.variant ?? 'info';
  return (
    <div
      role="status"
      className={resolveClass(`${ROOT_CLASS} ${VARIANT_BORDER[variant]}`, classNames?.root, unstyled)}
      style={resolveStyle({ minWidth: 240, maxWidth: 420 }, styles?.root, unstyled)}
    >
      <span
        className={resolveClass('flex-1', classNames?.message, unstyled)}
        style={resolveStyle({}, styles?.message, unstyled)}
      >
        {toast.message}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className={resolveClass(DISMISS_CLASS, classNames?.dismiss, unstyled)}
        style={resolveStyle({}, styles?.dismiss, unstyled)}
      >
        ×
      </button>
    </div>
  );
};

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/** The styleable slots of the stack: the fixed list container, plus per-toast
 *  slots forwarded to every child toast. */
export type ToastListSlot = 'list' | ToastSlot;

export interface ToastListProps extends StyleableProps<ToastListSlot> {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  /** Where the stack is pinned (default `'top-right'`). */
  position?: ToastPosition;
}

const positionStyle = (position: ToastPosition): CSSProperties => {
  const [v, h] = position.split('-') as ['top' | 'bottom', 'left' | 'right'];
  return { position: 'fixed', zIndex: 2000, [v]: 16, [h]: 16, display: 'flex', flexDirection: 'column', gap: 8 };
};

/**
 * A fixed-position stack of toasts. Bring your own state. Style the container via
 * the `list` slot; per-toast slots (`root`/`message`/`dismiss`) and `unstyled`
 * are forwarded to every child.
 *
 *   <ToastList toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
 */
export const ToastList = ({
  toasts,
  onDismiss,
  position = 'top-right',
  classNames,
  styles,
  unstyled,
}: ToastListProps) => {
  const { list: listClass, ...toastClassNames } = classNames ?? {};
  const { list: listStyle, ...toastStyles } = styles ?? {};
  return (
    <div
      className={resolveClass('', listClass, unstyled)}
      style={resolveStyle(positionStyle(position), listStyle, unstyled)}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          classNames={toastClassNames}
          styles={toastStyles}
          unstyled={unstyled}
        />
      ))}
    </div>
  );
};
