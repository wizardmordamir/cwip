// Shared, driver-free query model. Pure data + types so the SAME structured spec
// drives the UI builder, the copy/preview string, and server-side execution — for
// SQL (postgres/mysql/mssql) and MongoDB alike. No node/bun imports: usable in the
// browser, the server, and other apps (rubato).

export type SqlDialect = 'postgres' | 'mysql' | 'mssql';
export type QueryEngine = SqlDialect | 'mongodb';

export const SQL_DIALECTS: SqlDialect[] = ['postgres', 'mysql', 'mssql'];
export const QUERY_ENGINES: QueryEngine[] = ['postgres', 'mysql', 'mssql', 'mongodb'];

export const isSqlDialect = (e: string): e is SqlDialect => (SQL_DIALECTS as string[]).includes(e);

// Comparison operators shared across SQL and Mongo. Null-checks and range/list ops
// are first-class so the visual builder can offer them directly.
export type ComparisonOp =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'not like'
  | 'in'
  | 'not in'
  | 'is null'
  | 'is not null'
  | 'between';

export const COMPARISON_OPS: ComparisonOp[] = [
  '=',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'like',
  'not like',
  'in',
  'not in',
  'is null',
  'is not null',
  'between',
];

/** Ops that take no value (so the builder hides the value input). */
export const NULLARY_OPS: ComparisonOp[] = ['is null', 'is not null'];

export interface Condition {
  column: string;
  op: ComparisonOp;
  /** Scalar for most ops; an array for in/not in; a 2-tuple for between; ignored for null ops. */
  value?: unknown;
}

export type Combinator = 'and' | 'or';
export type SortDirection = 'asc' | 'desc';

export interface OrderBy {
  column: string;
  direction?: SortDirection;
}

/** A read-oriented SELECT spec — the structured builder's output. */
export interface SqlSelectSpec {
  table: string;
  schema?: string;
  /** Empty/undefined → SELECT *. */
  columns?: string[];
  distinct?: boolean;
  where?: Condition[];
  /** How the top-level where conditions combine. Default 'and'. */
  whereCombinator?: Combinator;
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
}

/** A parameterized SQL statement ready for a driver. */
export interface BuiltSql {
  sql: string;
  params: unknown[];
}
