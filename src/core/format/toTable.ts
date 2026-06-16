import { type Row, toTableColumns } from './toTableColumns';

const cell = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

/**
 * Render rows as an aligned, space-padded text table for terminal output. Column
 * widths fit the header and every cell; `null`/`undefined` render as empty.
 * Columns are inferred from the rows (first-seen key order) when not given.
 *
 *   toTable([{ name: 'Ada', age: 36 }, { name: 'Bo', age: 9 }])
 *   // name  age
 *   // Ada   36
 *   // Bo    9
 */
export const toTable = (rows: Row[], columns?: string[]): string => {
  const cols = toTableColumns(rows, columns);
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length), 0));
  const line = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(widths[i]))
      .join('  ')
      .trimEnd();
  return [line(cols), ...rows.map((r) => line(cols.map((c) => cell(r[c]))))].join('\n');
};
