import { type CSSProperties, useMemo, useState } from 'react';
import { type EnvEntry, parseEnvFile, serializeEnv, sortEnvEntries } from '../../../data/env';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { Button } from './Button';
import { FIELD_CLASS_AUTO } from './field';
import { SecretInput } from './SecretInput';

const Trash = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
  </svg>
);

export type EnvEditorSlot = 'root' | 'toolbar' | 'list' | 'row' | 'key' | 'value' | 'comment';

export interface EnvEditorProps extends StyleableProps<EnvEditorSlot> {
  /** The env file text (controlled). */
  value: string;
  onChange: (text: string) => void;
  readOnly?: boolean;
  /** Notified after a value is copied (e.g. to fire a toast). */
  onCopied?: (value: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A structured .env editor over env **text**: every `KEY=value` becomes a row with
 * an editable key and a masked value (eye reveal per row, or "Reveal all"); comment
 * and blank lines are shown muted and preserved on save. Add / remove rows and sort
 * keys A–Z. Persistence-free — the parent owns `value`/`onChange` and Save — so the
 * same component edits a file (rubato) or a stored set (cursedalchemy).
 */
export const EnvEditor = ({
  value,
  onChange,
  readOnly = false,
  onCopied,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: EnvEditorProps) => {
  const entries = useMemo(() => parseEnvFile(value), [value]);
  const [revealAll, setRevealAll] = useState(false);

  const commit = (next: EnvEntry[]) => onChange(serializeEnv(next));
  const patch = (i: number, p: Partial<EnvEntry>) => commit(entries.map((e, idx) => (idx === i ? { ...e, ...p } : e)));
  const remove = (i: number) => commit(entries.filter((_, idx) => idx !== i));
  const sort = () => onChange(serializeEnv(sortEnvEntries(entries)));
  const addRow = () => {
    const next = [...entries];
    while (next.length && next[next.length - 1].kind === 'blank') next.pop();
    next.push({ kind: 'pair', key: '', value: '', raw: '=', quote: '' });
    next.push({ kind: 'blank', key: '', value: '', raw: '' });
    commit(next);
  };

  const pairCount = entries.filter((e) => e.kind === 'pair').length;

  return (
    <div
      className={resolveClass('flex flex-col gap-3', classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      <div className={resolveClass('flex flex-wrap items-center gap-2', classNames?.toolbar, unstyled)}>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {pairCount} variable{pairCount === 1 ? '' : 's'}
        </span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setRevealAll((r) => !r)}>
          {revealAll ? 'Hide all' : 'Reveal all'}
        </Button>
        <Button variant="ghost" size="sm" onClick={sort} disabled={readOnly || pairCount < 2}>
          Sort A–Z
        </Button>
        {!readOnly && (
          <Button variant="default" size="sm" onClick={addRow}>
            + Add variable
          </Button>
        )}
      </div>

      <div className={resolveClass('flex flex-col gap-1.5', classNames?.list, unstyled)}>
        {entries.map((e, i) => {
          if (e.kind === 'pair') {
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional over a derived list
                key={`p-${i}`}
                className={resolveClass('flex items-center gap-2', classNames?.row, unstyled)}
              >
                <input
                  value={e.key}
                  readOnly={readOnly}
                  onChange={(ev) => patch(i, { key: ev.target.value })}
                  placeholder="KEY"
                  aria-label="variable name"
                  spellCheck={false}
                  autoComplete="off"
                  className={resolveClass(
                    `${FIELD_CLASS_AUTO} w-40 shrink-0 font-mono sm:w-56`,
                    classNames?.key,
                    unstyled,
                  )}
                />
                <span className="text-gray-400">=</span>
                <div className={resolveClass('min-w-0 flex-1', classNames?.value, unstyled)}>
                  <SecretInput
                    value={e.value}
                    onChange={readOnly ? undefined : (v) => patch(i, { value: v })}
                    reveal={revealAll || undefined}
                    label={e.key || 'value'}
                    onCopied={onCopied}
                  />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`Remove ${e.key || 'variable'}`}
                    title="Remove"
                    onClick={() => remove(i)}
                    className="inline-flex shrink-0 items-center justify-center rounded p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  >
                    <Trash />
                  </button>
                )}
              </div>
            );
          }
          if (e.kind === 'comment') {
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional over a derived list
                key={`c-${i}`}
                className={resolveClass('flex items-center gap-2', classNames?.row, unstyled)}
              >
                <input
                  value={e.raw}
                  readOnly={readOnly}
                  onChange={(ev) => patch(i, { raw: ev.target.value })}
                  aria-label="comment line"
                  spellCheck={false}
                  className={resolveClass(
                    'min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-mono text-xs text-gray-500 italic outline-none focus:border-gray-300 dark:text-gray-400 dark:focus:border-gray-700',
                    classNames?.comment,
                    unstyled,
                  )}
                />
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Remove comment"
                    title="Remove"
                    onClick={() => remove(i)}
                    className="inline-flex shrink-0 items-center justify-center rounded p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  >
                    <Trash />
                  </button>
                )}
              </div>
            );
          }
          return null; // blank lines are preserved in the text but not rendered as rows
        })}
        {pairCount === 0 && (
          <p className="px-1 py-2 text-sm text-gray-400">No variables yet — add one to get started.</p>
        )}
      </div>
    </div>
  );
};
