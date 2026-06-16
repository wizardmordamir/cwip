/** A row of tabular data, keyed by column name. */
export type Row = Record<string, unknown>;

/**
 * Resolve the column list for a set of rows: the explicit `columns` if given,
 * otherwise the union of the rows' keys in first-seen order. Shared by `toTable`
 * and `toCsv` so they infer columns identically.
 */
export const toTableColumns = (rows: Row[], columns?: string[]): string[] => {
  if (columns) {
    return columns;
  }
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }
  return ordered;
};
