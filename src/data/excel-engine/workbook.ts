import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { serializeCsv } from '../tabular/csv';
import { cellToScalar, sheetColumnCount } from './sheetModel';
import type { ExcelSourceKind } from './types';

// Load a workbook from raw bytes. CSV is parsed into a single worksheet; after
// the seed step every revision is stored as xlsx, so `kind` only matters here.
export const loadWorkbook = async (bytes: Uint8Array, kind: ExcelSourceKind): Promise<ExcelJS.Workbook> => {
  const wb = new ExcelJS.Workbook();
  if (kind === 'csv') {
    const text = Buffer.from(bytes).toString('utf8');
    const ws = await wb.csv.read(Readable.from([text]));
    // exceljs already names the csv sheet "sheet1"; only rename when it differs
    // case-insensitively. Assigning a name that case-insensitively matches an
    // existing sheet (including the sheet itself) throws "already exists", so a
    // plain `ws.name = 'Sheet1'` blows up on every CSV load.
    if (ws && ws.name.toLowerCase() !== 'sheet1') ws.name = 'Sheet1';
  } else {
    await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  }
  return wb;
};

// Serialize a workbook to xlsx bytes. Working copies / revisions are always xlsx
// (formulas + formatting preserved), regardless of the original source kind.
export const workbookToXlsxBytes = async (wb: ExcelJS.Workbook): Promise<Uint8Array> => {
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
};

// Serialize the FIRST worksheet to CSV bytes. Hidden rows (left by a hide-mode
// filter/limit) are dropped, so a headless run that filters produces the visible
// result — row 1 is treated as the header line, the rest as data.
export const workbookToCsvBytes = (wb: ExcelJS.Workbook): Uint8Array => {
  const ws = wb.worksheets[0];
  if (!ws) return new Uint8Array();
  const cols = sheetColumnCount(ws);
  const lines: string[][] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (row.hidden) continue;
    const cells: string[] = [];
    for (let c = 1; c <= cols; c++) {
      const v = cellToScalar(row.getCell(c).value);
      cells.push(v === null ? '' : String(v));
    }
    lines.push(cells);
  }
  const csv = serializeCsv({ columns: lines[0] ?? [], rows: lines.slice(1) });
  return new TextEncoder().encode(csv);
};
