import { requirePeer } from '../../core/_internal/requirePeer';

/** A spreadsheet row as a plain object, keyed by header. */
export type ExcelRow = Record<string, unknown>;

type XlsxModule = typeof import('xlsx');

const loadXlsx = (): XlsxModule => {
  const mod = requirePeer<XlsxModule>('xlsx', 'excel');
  return ((mod as { default?: XlsxModule }).default ?? mod) as XlsxModule;
};

export interface ReadSheetOptions {
  /** Sheet to read — name or zero-based index (default: the first sheet). */
  sheet?: string | number;
  /** Value to use for empty cells (passed through to xlsx `defval`). */
  defaultValue?: unknown;
}

/**
 * Read one sheet of an `.xlsx`/`.xls`/`.csv` buffer into an array of row objects
 * (first row = headers). The xlsx adapter over the pure-data world: bytes →
 * `Row[]`. Resolves the optional `xlsx` peer at call time.
 *
 *   const rows = readSheet<User>(buffer);            // first sheet
 *   const totals = readSheet(buffer, { sheet: 'Totals' });
 */
export const readSheet = <T extends ExcelRow = ExcelRow>(
  data: Buffer | Uint8Array,
  options: ReadSheetOptions = {},
): T[] => {
  const XLSX = loadXlsx();
  const wb = XLSX.read(data, { type: 'buffer' });
  const name =
    typeof options.sheet === 'string'
      ? options.sheet
      : wb.SheetNames[typeof options.sheet === 'number' ? options.sheet : 0];
  const sheet = name ? wb.Sheets[name] : undefined;
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: options.defaultValue ?? null });
};

/**
 * Read every sheet of a workbook into a `{ sheetName: Row[] }` map (sheet order
 * preserved). Use `readSheet` when you only need one.
 *
 *   const { Users, Orders } = readWorkbook(buffer);
 */
export const readWorkbook = (data: Buffer | Uint8Array): Record<string, ExcelRow[]> => {
  const XLSX = loadXlsx();
  const wb = XLSX.read(data, { type: 'buffer' });
  const out: Record<string, ExcelRow[]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<ExcelRow>(wb.Sheets[name], { defval: null });
  }
  return out;
};
