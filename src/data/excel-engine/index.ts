// cwip/excel-engine — the pure, server-side step engine for "excel automations":
// upload a workbook, apply an ordered list of declarative steps (filter/sort/
// add/fill/…), render a revision view. Built on exceljs + hyperformula (optional
// peers); date comparisons use cwip's own date toolkit (no moment). NO
// persistence, HTTP, or React —
// each consuming app owns its own revision store / routes / UI and drives this
// engine via applyStepToWorkbook + buildRevisionView.
export * from './conditions';
export * from './executors';
export * from './hyperformula';
export * from './sheetModel';
export * from './types';
export * from './view';
export * from './workbook';
