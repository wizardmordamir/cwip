import type ExcelJS from 'exceljs';
import type { HiddenMask } from './executors';
import { cellToScalar, headerTitles, sheetColumnCount } from './sheetModel';
import type { CellScalar, RevisionView, SheetMeta } from './types';

// Cap how many body rows we ship to the grid in one view (the grid is canvas-
// virtualized but the JSON payload still has to cross the wire / ctgr tunnel).
const DEFAULT_MAX_ROWS = 5000;

export interface BuildViewOpts {
  revisionId: string;
  activeSheet?: string;
  maxRows?: number;
}

// Build a renderable snapshot of ONE sheet for the SpreadsheetGrid. Row 1 is
// treated as the header (→ column titles); the body is rows 2..end. Manual-edit
// coordinates from the grid are absolute 0-based (body row i → sheet row i+2),
// resolved by the caller when recording a manualEdit step.
export const buildRevisionView = (wb: ExcelJS.Workbook, mask: HiddenMask, opts: BuildViewOpts): RevisionView => {
  const sheets: SheetMeta[] = wb.worksheets.map((ws) => ({
    id: ws.name,
    name: ws.name,
    rowCount: ws.rowCount,
    colCount: sheetColumnCount(ws),
  }));
  const active =
    opts.activeSheet && wb.getWorksheet(opts.activeSheet) ? opts.activeSheet : (wb.worksheets[0]?.name ?? '');
  const ws = active ? wb.getWorksheet(active) : undefined;
  if (!ws) {
    return { revisionId: opts.revisionId, sheets, activeSheet: active, columns: [], rows: [] };
  }

  const cols = sheetColumnCount(ws);
  const titles = headerTitles(ws, true);
  const columns: { key: string; title: string }[] = [];
  for (let c = 1; c <= cols; c++) {
    const t = titles[c - 1];
    columns.push({ key: String(c - 1), title: t?.length ? t : `Column ${c}` });
  }

  const rows: CellScalar[][] = [];
  const formulas: Record<string, string> = {};
  const limit = opts.maxRows ?? DEFAULT_MAX_ROWS;
  const end = ws.rowCount;
  let bodyIdx = 0;
  for (let r = 2; r <= end && bodyIdx < limit; r++, bodyIdx++) {
    const row = ws.getRow(r);
    const line: CellScalar[] = [];
    for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      line.push(cellToScalar(cell.value));
      const v = cell.value as { formula?: string } | null;
      if (v && typeof v === 'object' && 'formula' in v && v.formula) {
        formulas[`${bodyIdx},${c - 1}`] = `=${v.formula}`;
      }
    }
    rows.push(line);
  }

  const m = mask[active];
  return {
    revisionId: opts.revisionId,
    sheets,
    activeSheet: active,
    columns,
    rows,
    formulas,
    hiddenRows: m?.rows ?? [],
    hiddenCols: m?.cols ?? [],
  };
};
