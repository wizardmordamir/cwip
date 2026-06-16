import { type CSSProperties, useMemo, useState } from 'react';
import { diffEnvSets, type EnvSource } from '../../../data/env';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { Button } from './Button';
import { SecretInput } from './SecretInput';

export type EnvCompareSlot = 'root' | 'toolbar' | 'table' | 'th' | 'td';

export interface EnvCompareProps extends StyleableProps<EnvCompareSlot> {
  /** The named env texts to compare side by side. */
  sources: EnvSource[];
  /** Notified after a value is copied (e.g. to fire a toast). */
  onCopied?: (value: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Compare N named env texts in a key×source grid: every key is a row, every source
 * a column. Rows where a value is missing or disagrees are flagged (so "which apps
 * are missing / have a stale value" is obvious at a glance). Values are masked with
 * a single "Reveal all" toggle; "Only differences" hides keys that match everywhere.
 */
export const EnvCompare = ({ sources, onCopied, className, style, classNames, styles, unstyled }: EnvCompareProps) => {
  const diff = useMemo(() => diffEnvSets(sources), [sources]);
  const [revealAll, setRevealAll] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);

  const rows = onlyDiff ? diff.rows.filter((r) => r.differs) : diff.rows;
  const diffCount = diff.rows.filter((r) => r.differs).length;

  const th = resolveClass(
    'sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    classNames?.th,
    unstyled,
  );
  const td = resolveClass(
    'border-b border-gray-100 px-3 py-1.5 align-middle dark:border-gray-800',
    classNames?.td,
    unstyled,
  );

  if (sources.length === 0) {
    return <p className="text-sm text-gray-400">Pick env files to compare.</p>;
  }

  return (
    <div
      className={resolveClass('flex flex-col gap-3', classNames?.root ?? className, unstyled)}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      <div className={resolveClass('flex flex-wrap items-center gap-2', classNames?.toolbar, unstyled)}>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {diff.rows.length} key{diff.rows.length === 1 ? '' : 's'} · {diffCount} differ
        </span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setRevealAll((r) => !r)}>
          {revealAll ? 'Hide all' : 'Reveal all'}
        </Button>
        <Button variant={onlyDiff ? 'accent' : 'ghost'} size="sm" onClick={() => setOnlyDiff((d) => !d)}>
          Only differences
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className={resolveClass('w-full border-collapse text-sm', classNames?.table, unstyled)}>
          <thead>
            <tr>
              <th className={th}>Key</th>
              {diff.labels.map((label) => (
                <th key={label} className={th}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={row.differs ? 'bg-amber-50/60 dark:bg-amber-950/20' : undefined}>
                <td className={`${td} font-mono text-xs font-medium text-gray-700 dark:text-gray-200`}>{row.key}</td>
                {diff.labels.map((label) => {
                  const v = row.values[label];
                  return (
                    <td key={label} className={td}>
                      {v === undefined ? (
                        <span className="text-xs font-medium text-rose-500">— missing —</span>
                      ) : (
                        <SecretInput
                          value={v}
                          reveal={revealAll || undefined}
                          showToggle={!revealAll}
                          label={`${label} ${row.key}`}
                          onCopied={onCopied}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className={`${td} text-gray-400`} colSpan={diff.labels.length + 1}>
                  {onlyDiff ? 'No differences — every key matches across these sources.' : 'No keys found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
