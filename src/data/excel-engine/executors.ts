import type ExcelJS from 'exceljs';
import { type CellResolver, compareValues, evalGroup, groupIsEmpty } from './conditions';
import { evalFormulaColumn } from './hyperformula';
import { cellToScalar, extractGrid, firstDataRow, headerTitles, resolveColumn, sheetColumnCount } from './sheetModel';
import type { AutomationStep, CellScalar } from './types';

// Per-sheet record of rows/cols hidden by "hide"-mode filters. Rows are 0-based
// body-relative (row - firstDataRow); cols are 0-based absolute. Travels on the
// revision row (hidden_mask_json) so downstream steps + the grid can honor it.
export interface HiddenMask {
  [sheet: string]: { rows: number[]; cols: number[] };
}

export interface ExecOutcome {
  rowsAffected: number;
  colsAffected: number;
  sheetsAffected: number;
}

const noOutcome = (): ExecOutcome => ({ rowsAffected: 0, colsAffected: 0, sheetsAffected: 0 });

// Row/column/sort/add/fill steps act on the FIRST worksheet — the intended flow is
// to `keepSheet` down to one sheet first (matches the spec's example).
const activeSheet = (wb: ExcelJS.Workbook): ExcelJS.Worksheet => {
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Workbook has no worksheets');
  return ws;
};

const maskFor = (mask: HiddenMask, name: string) => {
  mask[name] ??= { rows: [], cols: [] };
  return mask[name];
};

// Build a CellResolver for one exceljs row given the sheet's header titles.
const rowResolver =
  (row: ExcelJS.Row, headers: string[]): CellResolver =>
  (ref) => {
    const ci = resolveColumn(ref, headers);
    return ci ? cellToScalar(row.getCell(ci).value) : null;
  };

const execKeepSheet = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'keepSheet' }): ExecOutcome => {
  const sheets = wb.worksheets;
  let keepIdx = -1;
  if (step.which.name) keepIdx = sheets.findIndex((w) => w.name === step.which.name);
  else if (typeof step.which.index === 'number') keepIdx = step.which.index;
  if (keepIdx < 0 || keepIdx >= sheets.length) {
    throw new Error(
      step.which.name
        ? `Worksheet "${step.which.name}" not found`
        : `Worksheet #${(step.which.index ?? 0) + 1} not found`,
    );
  }
  const keepId = sheets[keepIdx].id;
  let removed = 0;
  for (const ws of [...sheets]) {
    if (ws.id !== keepId) {
      wb.removeWorksheet(ws.id);
      removed++;
    }
  }
  return { ...noOutcome(), sheetsAffected: removed };
};

const execFilterRows = (
  wb: ExcelJS.Workbook,
  step: AutomationStep & { type: 'filterRows' },
  mask: HiddenMask,
): ExecOutcome => {
  const ws = activeSheet(wb);
  if (groupIsEmpty(step.where)) return noOutcome();
  const headers = headerTitles(ws, step.hasHeader);
  const start = firstDataRow(step.hasHeader);
  const end = ws.rowCount;
  // We always act on (hide/delete) the rows we do NOT keep. `keep: 'matching'`
  // (the builder default) keeps rows that satisfy `where` and drops the rest;
  // legacy steps — no `keep`, or 'nonMatching' — keep the non-matching rows, i.e.
  // they drop the matched ones (the original behavior).
  const keepMatching = step.keep === 'matching';
  const dropped: number[] = [];
  for (let r = start; r <= end; r++) {
    const row = ws.getRow(r);
    const matches = evalGroup(step.where, rowResolver(row, headers));
    if (matches !== keepMatching) dropped.push(r);
  }
  if (step.mode === 'delete') {
    for (let i = dropped.length - 1; i >= 0; i--) ws.spliceRows(dropped[i], 1);
  } else {
    const m = maskFor(mask, ws.name);
    for (const r of dropped) {
      ws.getRow(r).hidden = true;
      m.rows.push(r - start);
    }
  }
  return { ...noOutcome(), rowsAffected: dropped.length };
};

const execLimitRows = (
  wb: ExcelJS.Workbook,
  step: AutomationStep & { type: 'limitRows' },
  mask: HiddenMask,
): ExecOutcome => {
  const ws = activeSheet(wb);
  const start = firstDataRow(step.hasHeader);
  const end = ws.rowCount;
  const limit = Math.max(0, Math.floor(step.count ?? 0));
  const dropped: number[] = [];
  for (let r = start + limit; r <= end; r++) dropped.push(r);
  if (step.mode === 'delete') {
    for (let i = dropped.length - 1; i >= 0; i--) ws.spliceRows(dropped[i], 1);
  } else {
    const m = maskFor(mask, ws.name);
    for (const r of dropped) {
      ws.getRow(r).hidden = true;
      m.rows.push(r - start);
    }
  }
  return { ...noOutcome(), rowsAffected: dropped.length };
};

const execRenameColumn = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'renameColumn' }): ExecOutcome => {
  const ws = activeSheet(wb);
  // Renaming a named column only makes sense with a header row (row 1).
  const idx = resolveColumn(step.column, headerTitles(ws, true));
  if (!idx) throw new Error('Rename column not found');
  ws.getCell(1, idx).value = step.to;
  return { ...noOutcome(), colsAffected: 1 };
};

const execSortRows = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'sortRows' }): ExecOutcome => {
  const ws = activeSheet(wb);
  const headers = headerTitles(ws, step.hasHeader);
  const start = firstDataRow(step.hasHeader);
  const end = ws.rowCount;
  const cols = sheetColumnCount(ws);
  if (end < start) return noOutcome();
  const data: CellScalar[][] = [];
  for (let r = start; r <= end; r++) {
    const row = ws.getRow(r);
    const line: CellScalar[] = [];
    for (let c = 1; c <= cols; c++) line.push(cellToScalar(row.getCell(c).value));
    data.push(line);
  }
  const keys = step.by
    .map((k) => ({ idx: resolveColumn(k.column, headers), dir: k.dir }))
    .filter((k): k is { idx: number; dir: 'asc' | 'desc' } => k.idx !== null);
  data.sort((a, b) => {
    for (const k of keys) {
      const cmp = compareValues(a[k.idx - 1], b[k.idx - 1]);
      if (cmp !== 0) return k.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  for (let i = 0; i < data.length; i++) {
    const row = ws.getRow(start + i);
    for (let c = 1; c <= cols; c++) row.getCell(c).value = data[i][c - 1] as ExcelJS.CellValue;
  }
  return { ...noOutcome(), rowsAffected: data.length };
};

const execFilterColumns = (
  wb: ExcelJS.Workbook,
  step: AutomationStep & { type: 'filterColumns' },
  mask: HiddenMask,
): ExecOutcome => {
  const ws = activeSheet(wb);
  const headers = headerTitles(ws, true);
  const cols = sheetColumnCount(ws);
  const dropSet = new Set<number>();
  if (step.keep?.length) {
    const keepSet = new Set(step.keep.map((r) => resolveColumn(r, headers)).filter((c): c is number => c !== null));
    for (let c = 1; c <= cols; c++) if (!keepSet.has(c)) dropSet.add(c);
  }
  for (const ref of step.drop ?? []) {
    const ci = resolveColumn(ref, headers);
    if (ci) dropSet.add(ci);
  }
  const dropList = [...dropSet].sort((a, b) => a - b);
  if (step.mode === 'delete') {
    for (let i = dropList.length - 1; i >= 0; i--) ws.spliceColumns(dropList[i], 1);
  } else {
    const m = maskFor(mask, ws.name);
    for (const c of dropList) {
      ws.getColumn(c).hidden = true;
      m.cols.push(c - 1);
    }
  }
  return { ...noOutcome(), colsAffected: dropList.length };
};

const execAddColumn = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'addColumn' }): ExecOutcome => {
  const ws = activeSheet(wb);
  const cols = sheetColumnCount(ws);
  const rows = Math.max(ws.rowCount, 1);
  const insertAt = step.atIndex != null && step.atIndex >= 0 ? step.atIndex + 1 : cols + 1;
  const init = step.initialValue ?? null;
  if (insertAt <= cols) {
    const colData: ExcelJS.CellValue[] = [step.header];
    for (let r = 2; r <= rows; r++) colData.push(init as ExcelJS.CellValue);
    ws.spliceColumns(insertAt, 0, colData);
  } else {
    ws.getCell(1, insertAt).value = step.header;
    for (let r = 2; r <= rows; r++) ws.getCell(r, insertAt).value = init as ExcelJS.CellValue;
  }
  return { ...noOutcome(), colsAffected: 1 };
};

const execFillColumn = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'fillColumn' }): ExecOutcome => {
  const ws = activeSheet(wb);
  const headers = headerTitles(ws, step.hasHeader);
  const start = firstDataRow(step.hasHeader);
  const end = ws.rowCount;
  const targetIdx = resolveColumn(step.target, headers);
  if (!targetIdx) throw new Error('Fill target column not found');
  if (end < start) return noOutcome();
  let affected = 0;

  if (step.formula) {
    const grid = extractGrid(ws);
    const res = evalFormulaColumn(grid, targetIdx - 1, start - 1, end - 1, step.formula, !!step.formulaPerRow);
    for (let i = 0; i < res.values.length; i++) {
      const fx = res.formulas[i];
      if (!fx) continue; // single-aggregate mode leaves later rows blank
      ws.getCell(start + i, targetIdx).value = {
        formula: fx.replace(/^=/, ''),
        result: res.values[i] as Exclude<ExcelJS.CellValue, ExcelJS.CellFormulaValue>,
      } as ExcelJS.CellValue;
      affected++;
    }
    return { ...noOutcome(), rowsAffected: affected };
  }

  for (let r = start; r <= end; r++) {
    const row = ws.getRow(r);
    const getCell = rowResolver(row, headers);
    let setVal: CellScalar | undefined;
    for (const rule of step.rules ?? []) {
      if (evalGroup(rule.when, getCell)) {
        setVal = rule.set;
        break;
      }
    }
    if (setVal === undefined) setVal = step.elseValue ?? null;
    row.getCell(targetIdx).value = setVal as ExcelJS.CellValue;
    affected++;
  }
  return { ...noOutcome(), rowsAffected: affected };
};

const execManualEdit = (wb: ExcelJS.Workbook, step: AutomationStep & { type: 'manualEdit' }): ExecOutcome => {
  const ws = wb.getWorksheet(step.sheet) ?? wb.worksheets[0];
  if (!ws) throw new Error('Worksheet for manual edit not found');
  for (const e of step.edits) ws.getCell(e.row + 1, e.col + 1).value = e.value as ExcelJS.CellValue;
  return { ...noOutcome(), rowsAffected: step.edits.length };
};

// Apply ONE step to a workbook in place, mutating the hidden mask. Throws on a
// hard error (caller records status "error"). Disabled steps are skipped earlier.
export const applyStepToWorkbook = (wb: ExcelJS.Workbook, mask: HiddenMask, step: AutomationStep): ExecOutcome => {
  switch (step.type) {
    case 'keepSheet':
      return execKeepSheet(wb, step);
    case 'filterRows':
      return execFilterRows(wb, step, mask);
    case 'limitRows':
      return execLimitRows(wb, step, mask);
    case 'sortRows':
      return execSortRows(wb, step);
    case 'filterColumns':
      return execFilterColumns(wb, step, mask);
    case 'renameColumn':
      return execRenameColumn(wb, step);
    case 'addColumn':
      return execAddColumn(wb, step);
    case 'fillColumn':
      return execFillColumn(wb, step);
    case 'manualEdit':
      return execManualEdit(wb, step);
    default: {
      const _exhaustive: never = step;
      throw new Error(`Unknown step type: ${(_exhaustive as { type?: string })?.type}`);
    }
  }
};
