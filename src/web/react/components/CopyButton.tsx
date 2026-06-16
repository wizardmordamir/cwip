import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { Tooltip, type TooltipPlacement } from '../Tooltip';

// Self-contained default icons so the button carries no icon dependency (matches
// Toast / SecretInput). Apps with their own icon set can swap them via `copyIcon`
// / `copiedIcon`. `size` keeps them tunable for compact (toast) vs default use.
const DefaultCopyIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const DefaultCheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const COPY_BTN_CLASS =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded border-0 bg-transparent p-1 text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200 pointer-coarse:min-h-9 pointer-coarse:min-w-9';

export type CopyButtonSlot = 'root';

export interface CopyButtonProps extends StyleableProps<CopyButtonSlot> {
  /** The text written to the clipboard on click. Pass a function to resolve it
   *  lazily at click time (e.g. read it off the DOM or current state). */
  text: string | (() => string);
  /** Accessible name + native title (default `'Copy to clipboard'`); swapped to
   *  `copiedLabel` while the ✓ confirmation shows. */
  label?: string;
  /** Accessible name shown during the post-copy confirmation (default `'Copied'`). */
  copiedLabel?: string;
  /** Optional visible content rendered beside the icon (e.g. `"Copy"`). Omit for
   *  an icon-only button. A plain-string child flips to `copiedText` on success;
   *  a node is rendered as-is. */
  children?: ReactNode;
  /** Visible confirmation text shown when `children` is a string (default `'Copied'`). */
  copiedText?: string;
  /** Render the leading icon (default `true`). Set `false` for a text-only button. */
  showIcon?: boolean;
  /** Override the copy icon (e.g. pass your app's icon component). */
  copyIcon?: ReactNode;
  /** Override the confirmation icon (default a check). */
  copiedIcon?: ReactNode;
  /** Size passed to the built-in default icons (default 16; toasts use 14).
   *  Ignored when you supply your own `copyIcon`/`copiedIcon`. */
  iconSize?: number;
  /** Called with `text` after a successful copy (e.g. fire a toast). */
  onCopied?: (text: string) => void;
  /** Called when the clipboard write fails (insecure context / denied). */
  onError?: () => void;
  /** Stop the click bubbling (e.g. a copy button inside a clickable row). */
  stopPropagation?: boolean;
  /** How long the confirmation state stays (default 1200ms). */
  resetMs?: number;
  /** When set, a styled cwip {@link Tooltip} bubble replaces the native `title`. */
  tooltip?: ReactNode;
  /** Where the `tooltip` bubble sits (default `'top'`). */
  tooltipPlacement?: TooltipPlacement;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The shared copy-with-confirmation control — built on {@link useCopyToClipboard}
 * so the clipboard/timer logic lives in exactly one place. Defaults to a compact
 * icon button that flips to a ✓ for a moment; every interchangeable part is
 * overridable so apps can adjust without re-rolling the logic:
 *
 *  - `children` adds a visible label (a string flips to `copiedText`); icon-only otherwise.
 *  - `showIcon={false}` drops the icon for a text-only button.
 *  - `copyIcon` / `copiedIcon` swap in an app's own icon set.
 *  - `onCopied` / `onError` hook in toasts; `tooltip` adds a styled hover bubble.
 *  - the `root` slot (`className`/`classNames`/`styles`/`unstyled`) restyles the button.
 */
export const CopyButton = ({
  text,
  label = 'Copy to clipboard',
  copiedLabel = 'Copied',
  children,
  copiedText = 'Copied',
  showIcon = true,
  copyIcon,
  copiedIcon,
  iconSize = 16,
  onCopied,
  onError,
  stopPropagation,
  resetMs,
  tooltip,
  tooltipPlacement,
  disabled,
  className,
  classNames,
  styles,
  style,
  unstyled,
}: CopyButtonProps) => {
  const { copied, copy } = useCopyToClipboard(resetMs);
  const name = copied ? copiedLabel : label;

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) e.stopPropagation();
    const resolved = typeof text === 'function' ? text() : text;
    if (await copy(resolved)) onCopied?.(resolved);
    else onError?.();
  };

  const icon = copied
    ? (copiedIcon ?? <DefaultCheckIcon size={iconSize} />)
    : (copyIcon ?? <DefaultCopyIcon size={iconSize} />);
  // A plain-string label flips to the confirmation text; a node is left untouched.
  const visible = typeof children === 'string' ? (copied ? copiedText : children) : children;

  const button = (
    <button
      type="button"
      aria-label={name}
      // A styled `tooltip` provides the hover text, so the native title would just
      // duplicate it; fall back to title={name} otherwise.
      title={tooltip ? undefined : name}
      disabled={disabled}
      onClick={handleClick}
      className={resolveClass(COPY_BTN_CLASS, classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      {showIcon && icon}
      {visible != null && visible !== false && <span>{visible}</span>}
    </button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} placement={tooltipPlacement} multiline>
      {button}
    </Tooltip>
  ) : (
    button
  );
};
