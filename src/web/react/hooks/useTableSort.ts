import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

/** A comparable value. Nullish/empty values always sort to the end, in both
 *  directions (e.g. "never logged in" rows stay at the bottom either way). */
export type SortValue = string | number | boolean | null | undefined;

const isEmpty = (v: SortValue): boolean => v === null || v === undefined || v === '';

/** Compare two sort values, empties last. Ascending order. */
export const compareSortValues = (a: SortValue, b: SortValue): number => {
  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

type Accessors<T> = Record<string, (row: T) => SortValue>;

/**
 * Click-to-sort for any table. Pass the rows and a map of column-key → value
 * accessor. `onSort(key)` cycles asc → desc → unsorted on repeated clicks;
 * empties always sort last regardless of direction.
 *
 *   const { sorted, sortProps } = useTableSort(rows, {
 *     name: (r) => r.name,
 *     lastLogin: (r) => r.lastLoginAt,
 *   });
 */
export const useTableSort = <T>(rows: T[], accessors: Accessors<T>, initial?: { key: string; dir: SortDir }) => {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir | null>(initial?.dir ?? null);

  const onSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // Third click clears the sort, restoring the original order.
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    const accessor = accessors[sortKey];
    if (!accessor) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((x, y) => {
      const ax = accessor(x);
      const ay = accessor(y);
      const result = compareSortValues(ax, ay);
      // Keep empties last regardless of direction; flip only real comparisons.
      if (result === 1 && isEmpty(ax)) return 1;
      if (result === -1 && isEmpty(ay)) return -1;
      return result * dir;
    });
  }, [rows, accessors, sortKey, sortDir]);

  const sortProps = (key: string) => ({
    active: sortKey === key,
    dir: sortDir,
    onSort: () => onSort(key),
  });

  return { sorted, sortKey, sortDir, onSort, sortProps };
};
