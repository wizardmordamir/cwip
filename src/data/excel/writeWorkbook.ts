import { requirePeer } from '../../core/_internal/requirePeer';
import type { ExcelRow } from './readWorkbook';

type XlsxModule = typeof import('xlsx');

const loadXlsx = (): XlsxModule => {
  const mod = requirePeer<XlsxModule>('xlsx', 'excel');
  return ((mod as { default?: XlsxModule }).default ?? mod) as XlsxModule;
};

export interface WriteWorkbookOptions {
  /** Sheet name when writing a single `Row[]` (default `'Sheet1'`). */
  sheetName?: string;
  /** File format (default `'xlsx'`); e.g. `'csv'`, `'xlsb'`. */
  bookType?: 'xlsx' | 'xls' | 'csv' | 'xlsb' | 'ods';
}

const buildWorkbook = (XLSX: XlsxModule, sheets: Record<string, ExcelRow[]>) => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  }
  return wb;
};

/**
 * Serialize row objects to a workbook buffer. Pass a `Row[]` for a single sheet,
 * or a `{ sheetName: Row[] }` map for several. The inverse of `readWorkbook`
 * (round-trips in memory — no filesystem needed). Resolves the `xlsx` peer.
 *
 *   const buf = writeWorkbook(users, { sheetName: 'Users' });
 *   const buf2 = writeWorkbook({ Users: users, Orders: orders });
 */
export const writeWorkbook = (
  data: ExcelRow[] | Record<string, ExcelRow[]>,
  options: WriteWorkbookOptions = {},
): Buffer => {
  const XLSX = loadXlsx();
  const sheets = Array.isArray(data) ? { [options.sheetName ?? 'Sheet1']: data } : data;
  const wb = buildWorkbook(XLSX, sheets);
  return XLSX.write(wb, { type: 'buffer', bookType: options.bookType ?? 'xlsx' }) as Buffer;
};
