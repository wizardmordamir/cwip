// Shared types for the Excel Automations feature, used by both the server (the
// authoritative step engine, built on exceljs + hyperformula) and the UI (the
// rubato-style step builder). The discriminated `AutomationStep` union is the
// contract between the builder and the executors.

// ---------------------------------------------------------------------------
// Column references & comparison system
// ---------------------------------------------------------------------------

// A column can be referenced by its header text (preferred, survives reorder) or
// by zero-based index (fallback / when there is no header row).
export type ColumnRef = { byHeader?: string; byIndex?: number };

export type ComparisonOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'notEmpty'
  | 'dateBefore'
  | 'dateAfter'
  | 'dateOnOrBefore'
  | 'dateOnOrAfter';

export const COMPARISON_OPS: ComparisonOp[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'notEmpty',
  'dateBefore',
  'dateAfter',
  'dateOnOrBefore',
  'dateOnOrAfter',
];

export const COMPARISON_OP_LABEL: Record<ComparisonOp, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  notEmpty: 'is not empty',
  dateBefore: 'date is before',
  dateAfter: 'date is after',
  dateOnOrBefore: 'date is on or before',
  dateOnOrAfter: 'date is on or after',
};

// Ops that take no right-hand-side value.
export const UNARY_OPS: ComparisonOp[] = ['isEmpty', 'notEmpty'];
// Ops whose value is interpreted as a date (literal or relative).
export const DATE_OPS: ComparisonOp[] = ['dateBefore', 'dateAfter', 'dateOnOrBefore', 'dateOnOrAfter'];

export type CellScalar = string | number | boolean | null;

export interface Condition {
  column: ColumnRef;
  op: ComparisonOp;
  // Literal right-hand side. For DATE_OPS this is an ISO date string, or a
  // relative token like 'today' / '-30d' (N days ago) / '+7d'.
  value?: CellScalar;
  // ...or compare against another column instead of a literal.
  valueColumn?: ColumnRef;
}

// A group of conditions combined with AND (`all`) or OR (`any`). Exactly one of
// the two arrays is populated by the builder; an empty/absent group matches all.
export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type StepType =
  | 'keepSheet'
  | 'filterRows'
  | 'limitRows'
  | 'sortRows'
  | 'filterColumns'
  | 'renameColumn'
  | 'addColumn'
  | 'fillColumn'
  | 'manualEdit';

export const STEP_TYPES: StepType[] = [
  'keepSheet',
  'filterRows',
  'limitRows',
  'sortRows',
  'filterColumns',
  'renameColumn',
  'addColumn',
  'fillColumn',
  'manualEdit',
];

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  keepSheet: 'Keep only one worksheet',
  filterRows: 'Filter rows',
  limitRows: 'Limit rows',
  sortRows: 'Sort rows',
  filterColumns: 'Filter columns',
  renameColumn: 'Rename column',
  addColumn: 'Add column',
  fillColumn: 'Fill column',
  manualEdit: 'Manual edit',
};

// "hide" keeps the rows/cols but marks them hidden (recorded in the revision's
// hidden mask, and set hidden in the workbook so the export collapses them).
// "delete" physically removes them. The builder exposes a one-click "delete the
// filtered set" affordance that simply flips this toggle.
export type FilterMode = 'hide' | 'delete';

// Which side of a row filter's condition is KEPT. `matching` (the builder
// default) shows the rows that satisfy `where` and drops everything else;
// `nonMatching` keeps the rows that DON'T match and drops the matched ones.
// An absent `keep` is treated as `nonMatching` so pre-existing steps — written
// before this field existed, when the condition always selected the rows to act
// on — keep their original "drop the matched rows" behavior.
export type FilterKeep = 'matching' | 'nonMatching';

// Fields shared by every step. `id` is stable across reorders; `enabled` lets
// debug mode toggle a step without removing it.
export interface StepBase {
  id: string;
  enabled: boolean;
  label?: string;
}

export type KeepSheetStep = StepBase & {
  type: 'keepSheet';
  which: { index?: number; name?: string };
};

export type FilterRowsStep = StepBase & {
  type: 'filterRows';
  where: ConditionGroup;
  keep?: FilterKeep;
  mode: FilterMode;
  hasHeader: boolean;
};

// Keep only the first `count` data rows; the rest are hidden or deleted (per
// `mode`), just like filterRows. A simple "top N" / truncate.
export type LimitRowsStep = StepBase & {
  type: 'limitRows';
  count: number;
  mode: FilterMode;
  hasHeader: boolean;
};

export type SortRowsStep = StepBase & {
  type: 'sortRows';
  by: { column: ColumnRef; dir: 'asc' | 'desc' }[];
  hasHeader: boolean;
};

// Rename a single column's header (row 1) to `to`. `column` is resolved by header
// or index against the current sheet.
export type RenameColumnStep = StepBase & {
  type: 'renameColumn';
  column: ColumnRef;
  to: string;
};

export type FilterColumnsStep = StepBase & {
  type: 'filterColumns';
  keep?: ColumnRef[];
  drop?: ColumnRef[];
  mode: FilterMode;
};

export type AddColumnStep = StepBase & {
  type: 'addColumn';
  header: string;
  atIndex?: number; // append when omitted
  initialValue?: CellScalar;
};

// Fill a target column either by comparison-derived rules (first matching rule
// wins, else `elseValue`) OR by a literal Excel formula. Exactly one of `rules`
// / `formula` is set by the builder.
export type FillColumnStep = StepBase & {
  type: 'fillColumn';
  target: ColumnRef;
  rules?: { when: ConditionGroup; set: CellScalar }[];
  elseValue?: CellScalar;
  formula?: string; // e.g. "=SUM(A2:A100)"
  formulaPerRow?: boolean; // apply the formula relative to each data row
  hasHeader: boolean;
};

export type ManualEditStep = StepBase & {
  type: 'manualEdit';
  sheet: string;
  // Recorded cell edits (0-based row/col within the sheet) so a full re-run is
  // deterministic. Captured live in the grid during debug.
  edits: { row: number; col: number; value: CellScalar }[];
};

export type AutomationStep =
  | KeepSheetStep
  | FilterRowsStep
  | LimitRowsStep
  | SortRowsStep
  | FilterColumnsStep
  | RenameColumnStep
  | AddColumnStep
  | FillColumnStep
  | ManualEditStep;

// ---------------------------------------------------------------------------
// Run results (mirrors rubato's StepResult shape)
// ---------------------------------------------------------------------------

export type StepStatus = 'ok' | 'error' | 'skipped';

export interface StepResult {
  stepId: string;
  stepIndex: number;
  type: StepType;
  status: StepStatus;
  rowsAffected: number;
  colsAffected: number;
  sheetsAffected: number;
  error?: string;
  producedRevisionId?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface RunResult {
  automationId: string;
  steps: StepResult[];
  finalRevisionId: string;
  resultRevisionId?: string; // the auto-saved RESULT for a full run-all
}

// ---------------------------------------------------------------------------
// API row shapes (camelCase, shared by the server mappers and the UI hooks)
// ---------------------------------------------------------------------------

export type ExcelSourceKind = 'xlsx' | 'csv';

export type RevisionKind = 'original' | 'step' | 'manual' | 'result';

export interface ExcelAutomation {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  sourceBinaryId: string;
  sourceKind: ExcelSourceKind;
  steps: AutomationStep[];
  originalRevisionId?: string;
  currentRevisionId?: string;
  resultRevisionId?: string;
  archived: boolean;
}

export interface ExcelRevision {
  id: string;
  automationId: string;
  createdAt: string;
  updatedAt: string;
  parentRevisionId?: string;
  seq: number;
  label: string;
  kind: RevisionKind;
  producedByStepIndex?: number;
  producedByStepId?: string;
  byteSize: number;
  status: StepStatus;
  stepResult?: StepResult;
}

export interface ExcelRecipe {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  steps: AutomationStep[];
}

// A renderable snapshot of one sheet of a revision, for the SpreadsheetGrid.
export interface SheetMeta {
  id: string; // sheet name acts as id
  name: string;
  rowCount: number;
  colCount: number;
}

export interface RevisionView {
  revisionId: string;
  sheets: SheetMeta[];
  activeSheet: string;
  // Header row for the active sheet (display titles), and the body cell values.
  columns: { key: string; title: string }[];
  rows: CellScalar[][];
  // Raw formulas keyed by "r,c" (0-based, body-relative) for the formula bar.
  formulas?: Record<string, string>;
  // Hidden rows/cols (0-based, body-relative) for filter "hide" mode.
  hiddenRows?: number[];
  hiddenCols?: number[];
}
