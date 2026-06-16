/**
 * A simple tabular model — a header row plus string cells. The shape every
 * `tabular` transform operates on; spreadsheet/CSV adapters (`cwip/excel`,
 * app IO layers) convert to and from it at the edges.
 */
export interface TabularTable {
  columns: string[];
  rows: string[][];
}

export type TabularCompare =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'empty'
  | 'notEmpty'
  /** Cell is (case-insensitively) one of `values` — e.g. keep only these 30 apps. */
  | 'in'
  /** Cell is NOT one of `values` — drop these apps/rows. */
  | 'notIn';

export type TabularAggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'concat';

/** One aggregate output column for a `group` step. */
export interface TabularAggregate {
  /** Source column (ignored for `count`). */
  column?: string;
  fn: TabularAggregateFn;
  /** Output column name; defaults to `count` / `fn(column)`. */
  as?: string;
}

/** One transform step. Discriminated by `op`; only the relevant fields apply. */
export type TabularOp =
  | { op: 'select'; columns: string[] }
  | { op: 'rename'; rename: Record<string, string> }
  | { op: 'filter'; column: string; compare: TabularCompare; value?: string; values?: string[] }
  | { op: 'sort'; column: string; dir?: 'asc' | 'desc' }
  /**
   * Group rows by one or more columns and emit one row per distinct key (in
   * first-appearance order) with the given aggregate columns. With no
   * aggregates, a `count` column is emitted.
   */
  | { op: 'group'; by: string[]; aggregates?: TabularAggregate[] }
  | { op: 'limit'; count: number }
  /**
   * Send the current table to an injected LLM with a question, and load the
   * reply back as the table for the next step. The data is passed as CSV;
   * `responseFormat` is the shape the model is asked to reply in (default csv).
   */
  | { op: 'askAi'; question: string; responseFormat?: 'csv' | 'json' };
