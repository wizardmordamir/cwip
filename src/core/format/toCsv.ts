import { type Row, toTableColumns } from './toTableColumns';

const cell = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

export interface CsvOptions {
  /** Field separator (default `,`). Use `\t` for TSV. */
  delimiter?: string;
  /** Emit the header row of column names (default `true`). */
  header?: boolean;
}

/**
 * Render rows as RFC-4180 CSV: a value containing the delimiter, a quote, or a
 * newline is wrapped in double quotes with embedded quotes doubled. Columns are
 * inferred from the rows when not given; pass `{ delimiter: '\t' }` for TSV.
 *
 *   toCsv([{ a: 1, b: 'x,y' }]) // 'a,b\n1,"x,y"'
 */
export const toCsv = (rows: Row[], columns?: string[], options: CsvOptions = {}): string => {
  const delimiter = options.delimiter ?? ',';
  const cols = toTableColumns(rows, columns);
  const needsQuote = new RegExp(`["\\n\\r${delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
  const esc = (value: unknown) => {
    const s = cell(value);
    return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(delimiter));
  return (options.header === false ? body : [cols.join(delimiter), ...body]).join('\n');
};
