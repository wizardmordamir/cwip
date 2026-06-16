import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import { formatJson, type JsonFormatResult, parseLoose } from '../../../data/json';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { Button } from './Button';
import { FIELD_CLASS } from './field';

export interface JsonEditorParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  errorLine?: number;
  errorCol?: number;
}

export type JsonEditorSlot = 'root' | 'textarea' | 'toolbar' | 'status' | 'button';

export interface JsonEditorProps extends StyleableProps<JsonEditorSlot> {
  value: string;
  onChange: (text: string) => void;
  /**
   * Validate the current text → drives the status line + `onResult`. Defaults to
   * the tolerant {@link parseLoose} (accepts JS-isms). Pass a custom parser to add
   * domain validation (e.g. "must be a template entry").
   */
  parse?: (text: string) => JsonEditorParseResult;
  /**
   * Produce canonical text for the "Format" button. Defaults to strict
   * {@link formatJson}. Ignored when `normalize` is set.
   */
  format?: (text: string) => JsonFormatResult;
  /**
   * Post-parse value transform applied by "Format" before re-serializing (e.g.
   * rewrite `${homedir()}` → `<HOME>`). When set, Format does
   * parseLoose → normalize → pretty JSON.
   */
  normalize?: (value: unknown) => unknown;
  placeholder?: string;
  /** Rows for the textarea (default 8). */
  rows?: number;
  /** "Format" button label (default "Format JSON"); `null` hides the button. */
  formatLabel?: string | null;
  /** Reports the latest parse result so a parent can gate Save. */
  onResult?: (result: JsonEditorParseResult) => void;
  /** Hide the live validity status line. */
  hideStatus?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  id?: string;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

const TEXTAREA_CLASS = `${FIELD_CLASS} resize-y font-mono text-xs leading-relaxed`;

/**
 * A controlled JSON / JS-object editor: a monospace textarea with a live validity
 * status and a "Format" button, built on the tolerant {@link parseLoose} /
 * {@link formatJson} core (single quotes, unquoted keys, trailing commas, comments
 * all accepted, then emitted as clean JSON). Persistence-free and unopinionated —
 * the parent owns `value`/`onChange` and Save. Inject `parse` for domain
 * validation and `normalize` for a Format-time value rewrite. Tailwind-first;
 * overridable per slot.
 */
export const JsonEditor = ({
  value,
  onChange,
  parse,
  format,
  normalize,
  placeholder,
  rows = 8,
  formatLabel = 'Format JSON',
  onResult,
  hideStatus = false,
  readOnly = false,
  autoFocus = false,
  id,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: JsonEditorProps) => {
  // Hold `parse`/`onResult` in refs so the memo + effect depend ONLY on `value`.
  // This keeps `result` referentially stable per `value` even when the parent
  // passes inline `parse`/`onResult` closures (new identities every render) — so an
  // `onResult` that setStates can't trigger a re-render loop. (`parse` is treated as
  // conceptually stable; it re-runs when `value` changes, which is what matters.)
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const result = useMemo<JsonEditorParseResult>(
    () => (parseRef.current ? parseRef.current(value) : parseLoose(value)),
    [value],
  );

  // Surface the parse result upward (Save-gating) only when it changes — `result`
  // is memoized on `value`, so this fires per edit, not per parent re-render.
  useEffect(() => {
    onResultRef.current?.(result);
  }, [result]);

  const runFormat = () => {
    if (readOnly) return;
    if (normalize) {
      const parsed = parseLoose(value);
      if (parsed.ok && parsed.value !== undefined) onChange(JSON.stringify(normalize(parsed.value), null, 2));
      return;
    }
    const r = (format ?? ((t: string) => formatJson(t, { strictOutput: true, indent: 2 })))(value);
    if (r.ok && r.output) onChange(r.output);
  };

  const empty = value.trim() === '';
  const where = result.errorLine ? ` (line ${result.errorLine}${result.errorCol ? `:${result.errorCol}` : ''})` : '';

  return (
    <div
      className={resolveClass('flex flex-col gap-2', classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        // biome-ignore lint/a11y/noAutofocus: opt-in via prop, used in modals
        autoFocus={autoFocus}
        spellCheck={false}
        className={resolveClass(TEXTAREA_CLASS, classNames?.textarea, unstyled)}
      />
      {(!hideStatus || formatLabel !== null) && (
        <div className={resolveClass('flex items-center justify-between gap-2', classNames?.toolbar, unstyled)}>
          {!hideStatus ? (
            <span
              className={resolveClass(
                `text-xs ${
                  empty
                    ? 'text-gray-400'
                    : result.ok
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                }`,
                classNames?.status,
                unstyled,
              )}
            >
              {empty ? 'Empty' : result.ok ? '✓ Valid' : `✕ ${result.error ?? 'Invalid'}${where}`}
            </span>
          ) : (
            <span />
          )}
          {formatLabel !== null && (
            <Button
              variant="ghost"
              size="sm"
              disabled={readOnly || empty || !result.ok}
              onClick={runFormat}
              className={typeof classNames?.button === 'string' ? classNames.button : undefined}
            >
              {formatLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
