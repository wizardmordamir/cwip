import type { TabularTable } from './types';

/**
 * Parse CSV text into a table. Handles quoted fields (embedded commas, quotes,
 * and newlines), normalizes CRLF, and pads ragged rows to the header width.
 * The first row is the header. (The renderer counterpart of `toCsv` in
 * `format/`, which renders record objects; this pair works on the positional
 * `TabularTable` model.)
 */
export const parseCsv = (text: string): TabularTable => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // Flush the trailing field/row unless the input ended on a clean newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const columns = rows.shift() ?? [];
  // Normalize ragged rows to the header width.
  const norm = rows.map((r) => columns.map((_, i) => r[i] ?? ''));
  return { columns, rows: norm };
};

/** Serialize a table to CSV (trailing newline), quoting cells that need it. */
export const serializeCsv = (table: TabularTable): string => {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [table.columns.map(cell).join(',')];
  for (const r of table.rows) {
    lines.push(r.map(cell).join(','));
  }
  return `${lines.join('\n')}\n`;
};
