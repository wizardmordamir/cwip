import type { CSSProperties, ReactNode } from 'react';
import { CopyButton } from './components/CopyButton';
import { resolveClass, resolveStyle, type StyleableProps } from './styling';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: ReactNode;
  variant?: ToastVariant;
  /** Plain text the copy button writes to the clipboard. Defaults to `message`
   *  when it's a string; when neither is a string there's nothing to copy and the
   *  copy button is omitted. */
  copyText?: string;
}

/** The styleable slots of a single toast. */
export type ToastSlot = 'root' | 'message' | 'actions' | 'copy' | 'dismiss';

export interface ToastProps extends StyleableProps<ToastSlot> {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  /** Show the copy-to-clipboard button when there's text to copy (default true). */
  showCopy?: boolean;
}

// The accent (left border) per variant — Tailwind classes so they theme/dark-mode
// with the host app. The rest of the surface is neutral + dark-aware.
const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-blue-500',
  success: 'border-green-600',
  warning: 'border-amber-600',
  error: 'border-red-600',
};

// `items-start` so the action buttons stay pinned to the top when a long message
// wraps to multiple lines, instead of floating to the vertical middle.
const ROOT_CLASS =
  'flex items-start gap-2 rounded-md border-l-4 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-md dark:bg-gray-800 dark:text-gray-100';
// `min-w-0` lets the flex item shrink below its content width; `break-words` +
// inline `overflowWrap:anywhere` force long unbroken strings (URLs, JSON blobs) to
// wrap instead of overflowing the toast.
const MESSAGE_CLASS = 'min-w-0 flex-1 whitespace-pre-wrap break-words';
const ACTION_CLASS =
  'flex shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent leading-none text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';

/**
 * A single, store-agnostic toast — bring your own list + `onDismiss`. Tailwind-
 * first, variant-colored, accessible (`role="status"`). Long messages wrap and
 * cap their height with a scroll (never overflow the container), and a copy
 * button lifts the text to the clipboard. Overridable per slot (`root`,
 * `message`, `actions`, `copy`, `dismiss`) via `classNames`/`styles`/`unstyled`.
 * Width is an inline structural default so it stays sane without a stylesheet.
 */
export const Toast = ({ toast, onDismiss, showCopy = true, classNames, styles, unstyled }: ToastProps) => {
  const variant = toast.variant ?? 'info';
  const copyText = toast.copyText ?? (typeof toast.message === 'string' ? toast.message : undefined);

  return (
    <div
      role="status"
      className={resolveClass(`${ROOT_CLASS} ${VARIANT_BORDER[variant]}`, classNames?.root, unstyled)}
      style={resolveStyle({ minWidth: 240, maxWidth: 420 }, styles?.root, unstyled)}
    >
      <span
        className={resolveClass(MESSAGE_CLASS, classNames?.message, unstyled)}
        style={resolveStyle({ maxHeight: 200, overflowY: 'auto', overflowWrap: 'anywhere' }, styles?.message, unstyled)}
      >
        {toast.message}
      </span>
      <span
        className={resolveClass('flex shrink-0 items-start gap-0.5', classNames?.actions, unstyled)}
        style={resolveStyle({}, styles?.actions, unstyled)}
      >
        {showCopy && copyText && (
          <CopyButton
            text={copyText}
            label="Copy message"
            iconSize={14}
            classNames={{ root: classNames?.copy }}
            styles={{ root: styles?.copy }}
            unstyled={unstyled}
          />
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast.id)}
          className={resolveClass(`${ACTION_CLASS} px-1 text-base`, classNames?.dismiss, unstyled)}
          style={resolveStyle({}, styles?.dismiss, unstyled)}
        >
          ×
        </button>
      </span>
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
  /** Forwarded to every toast: show the copy-to-clipboard button (default true). */
  showCopy?: boolean;
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
  showCopy,
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
          showCopy={showCopy}
          classNames={toastClassNames}
          styles={toastStyles}
          unstyled={unstyled}
        />
      ))}
    </div>
  );
};
