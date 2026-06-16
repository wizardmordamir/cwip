import { type CSSProperties, useState } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';

// Tiny self-contained icons so the component carries no icon dependency.
const Eye = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.94M6.3 6.3A13.2 13.2 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 3.7-.76" />
    <path d="m1 1 22 22" />
  </svg>
);
const Copy = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const BTN_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded p-1 text-gray-400 transition hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 pointer-coarse:min-h-9 pointer-coarse:min-w-9';

export type SecretInputSlot = 'root' | 'input' | 'button';

export interface SecretInputProps extends StyleableProps<SecretInputSlot> {
  value: string;
  /** Omit to render a read-only display (still revealable + copyable). */
  onChange?: (value: string) => void;
  /** Controlled reveal — overrides the internal eye toggle (e.g. a "reveal all").
   *  Leave undefined to use the built-in per-field toggle. */
  reveal?: boolean;
  /** Called when the eye is toggled; pair with `reveal` for fully controlled mode. */
  onToggleReveal?: () => void;
  /** Accessible name used on the field + the icon buttons. */
  label?: string;
  placeholder?: string;
  /** Show the eye toggle (default true) / the copy button (default true). */
  showToggle?: boolean;
  showCopy?: boolean;
  /** Notified after a successful copy (e.g. to fire a toast). */
  onCopied?: (value: string) => void;
  id?: string;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A masked secret field: dots until revealed, with an eye toggle and a copy button
 * (copy never has to reveal). Editable when `onChange` is given, read-only display
 * otherwise. Reveal is uncontrolled by default; pass `reveal` to drive it from a
 * parent (a "reveal all"). Tailwind-first, overridable per slot. No icon dependency.
 */
export const SecretInput = ({
  value,
  onChange,
  reveal,
  onToggleReveal,
  label = 'secret value',
  placeholder,
  showToggle = true,
  showCopy = true,
  onCopied,
  id,
  autoFocus = false,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: SecretInputProps) => {
  const [internalShown, setInternalShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const shown = reveal !== undefined ? reveal : internalShown;
  const readOnly = !onChange;

  const toggle = () => (onToggleReveal ? onToggleReveal() : setInternalShown((s) => !s));

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      onCopied?.(value);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div
      className={resolveClass(
        'flex items-center gap-0.5 rounded-lg border border-gray-300 bg-white px-1 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 dark:border-gray-700 dark:bg-gray-900',
        classNames?.root ?? className,
        unstyled,
      )}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        // biome-ignore lint/a11y/noAutofocus: opt-in via prop, used in editor rows
        autoFocus={autoFocus}
        className={resolveClass(
          'min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-base text-gray-900 outline-none sm:text-sm dark:text-gray-100',
          classNames?.input,
          unstyled,
        )}
      />
      {showToggle && (
        <button
          type="button"
          aria-label={shown ? `Hide ${label}` : `Reveal ${label}`}
          title={shown ? 'Hide' : 'Reveal'}
          onClick={toggle}
          className={resolveClass(BTN_CLASS, classNames?.button, unstyled)}
        >
          {shown ? <EyeOff /> : <Eye />}
        </button>
      )}
      {showCopy && (
        <button
          type="button"
          aria-label={`Copy ${label}`}
          title="Copy"
          onClick={copy}
          className={resolveClass(BTN_CLASS, classNames?.button, unstyled)}
        >
          {copied ? <Check /> : <Copy />}
        </button>
      )}
    </div>
  );
};
