import type ExcelJS from 'exceljs';
import type { CellScalar, ColumnRef } from './types';

// All coordinates in this module are exceljs-native (1-based rows AND columns).
// ColumnRef.byIndex coming from the UI is 0-based, so it maps to col = byIndex + 1.

// Normalize an exceljs cell value to a plain scalar for conditions / grid display.
// Handles formula objects ({formula,result}), rich text, hyperlinks, dates, errors.
export const cellToScalar = (value: ExcelJS.CellValue | undefined): CellScalar => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if ('result' in v) return cellToScalar(v.result as ExcelJS.CellValue); // formula cell
    if ('text' in v) return String(v.text); // hyperlink
    if ('richText' in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((r) => r.text).join('');
    }
    if ('error' in v) return String(v.error);
  }
  return String(value);
};

// The number of populated columns across the sheet. exceljs's `columnCount`
// over-reports after a spliceColumns (it leaves a ghost trailing column), so we
// derive the width from actual content: the rightmost column holding any
// non-empty value across the header + a sample of body rows.
export const sheetColumnCount = (ws: ExcelJS.Worksheet): number => {
  const upper = Math.max(ws.columnCount || 0, 1);
  const probeRows = Math.min(ws.rowCount || 0, 200);
  let max = 0;
  for (let r = 1; r <= probeRows; r++) {
    const row = ws.getRow(r);
    for (let c = upper; c > max; c--) {
      const v = cellToScalar(row.getCell(c).value);
      if (v !== null && !(typeof v === 'string' && v.trim() === '')) {
        if (c > max) max = c;
        break;
      }
    }
  }
  return max;
};

// Header titles (1-based column → title). Empty when the sheet has no header row.
export const headerTitles = (ws: ExcelJS.Worksheet, hasHeader: boolean): string[] => {
  if (!hasHeader) return [];
  const out: string[] = [];
  const cols = sheetColumnCount(ws);
  const row = ws.getRow(1);
  for (let c = 1; c <= cols; c++) {
    const s = cellToScalar(row.getCell(c).value);
    out.push(s === null ? '' : String(s));
  }
  return out;
};

// Resolve a ColumnRef to a 1-based exceljs column index, or null when it can't be
// matched (e.g. a step references a column a prior step deleted).
export const resolveColumn = (ref: ColumnRef | undefined, headers: string[]): number | null => {
  if (!ref) return null;
  if (ref.byHeader !== undefined && ref.byHeader !== '') {
    const idx = headers.findIndex((h) => h.trim().toLowerCase() === ref.byHeader!.trim().toLowerCase());
    if (idx >= 0) return idx + 1;
    // fall through to byIndex if header not found
  }
  if (ref.byIndex !== undefined && ref.byIndex >= 0) return ref.byIndex + 1;
  return null;
};

// The first data row (2 when there's a header, else 1).
export const firstDataRow = (hasHeader: boolean): number => (hasHeader ? 2 : 1);

// Read one sheet into a dense 2D array of scalars (1-based rows/cols flattened to
// 0-based array). Used to seed HyperFormula and to build grid views.
export const extractGrid = (ws: ExcelJS.Worksheet): CellScalar[][] => {
  const rows = ws.rowCount || 0;
  const cols = sheetColumnCount(ws);
  const grid: CellScalar[][] = [];
  for (let r = 1; r <= rows; r++) {
    const row = ws.getRow(r);
    const line: CellScalar[] = [];
    for (let c = 1; c <= cols; c++) line.push(cellToScalar(row.getCell(c).value));
    grid.push(line);
  }
  return grid;
};
