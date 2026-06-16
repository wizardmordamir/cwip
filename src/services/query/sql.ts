import type { BuiltSql, Combinator, Condition, SqlDialect, SqlSelectSpec } from './types';

// Dialect-aware SELECT builder. Produces a PARAMETERIZED statement (values bound,
// never interpolated) plus a separate inline-string serializer for copy/preview.
// Identifiers (table/column names) can't be parameters, so they're quoted with the
// dialect's quote char, doubled to neutralize injection.

const QUOTE: Record<SqlDialect, [open: string, close: string]> = {
  postgres: ['"', '"'],
  mysql: ['`', '`'],
  mssql: ['[', ']'],
};

/** Quote one identifier segment, escaping the closing char by doubling it. */
const quoteIdent = (name: string, dialect: SqlDialect): string => {
  const [open, close] = QUOTE[dialect];
  // mssql ']' is the only meaningful escape; for "/` the open===close.
  const escaped = name.split(close).join(close + close);
  return `${open}${escaped}${close}`;
};

/** Quote a possibly-dotted identifier (schema.table, table.column). */
const quotePath = (path: string, dialect: SqlDialect): string =>
  path
    .split('.')
    .map((seg) => quoteIdent(seg.trim(), dialect))
    .join('.');

// Per-dialect positional placeholder for the Nth (1-based) bound value.
const placeholder = (dialect: SqlDialect, index: number): string => {
  if (dialect === 'postgres') return `$${index}`;
  if (dialect === 'mssql') return `@p${index}`;
  return '?'; // mysql
};

const qualifiedTable = (spec: SqlSelectSpec, dialect: SqlDialect): string =>
  spec.schema
    ? `${quoteIdent(spec.schema, dialect)}.${quoteIdent(spec.table, dialect)}`
    : quotePath(spec.table, dialect);

interface WhereBuild {
  clause: string;
  params: unknown[];
}

const buildWhere = (
  conditions: Condition[] | undefined,
  combinator: Combinator,
  dialect: SqlDialect,
  startIndex: number,
): WhereBuild => {
  const params: unknown[] = [];
  let i = startIndex;
  const ph = () => placeholder(dialect, i++);

  const parts = (conditions ?? [])
    .filter((c) => c.column)
    .map((c) => {
      const col = quotePath(c.column, dialect);
      switch (c.op) {
        case 'is null':
          return `${col} IS NULL`;
        case 'is not null':
          return `${col} IS NOT NULL`;
        case 'in':
        case 'not in': {
          const arr = Array.isArray(c.value) ? c.value : [c.value];
          if (arr.length === 0) return c.op === 'in' ? '1=0' : '1=1'; // empty IN () is invalid SQL
          const list = arr.map(() => ph()).join(', ');
          params.push(...arr);
          return `${col} ${c.op === 'in' ? 'IN' : 'NOT IN'} (${list})`;
        }
        case 'between': {
          const [a, b] = Array.isArray(c.value) ? c.value : [c.value, c.value];
          const pa = ph();
          const pb = ph();
          params.push(a, b);
          return `${col} BETWEEN ${pa} AND ${pb}`;
        }
        case 'like':
        case 'not like': {
          params.push(c.value);
          return `${col} ${c.op === 'like' ? 'LIKE' : 'NOT LIKE'} ${ph()}`;
        }
        default: {
          params.push(c.value);
          return `${col} ${c.op} ${ph()}`;
        }
      }
    });

  if (parts.length === 0) return { clause: '', params };
  const joiner = combinator === 'or' ? ' OR ' : ' AND ';
  return { clause: `WHERE ${parts.join(joiner)}`, params };
};

/**
 * Build a parameterized SELECT for the given dialect. Values are bound; identifiers
 * are quoted. mssql gets OFFSET/FETCH (needs ORDER BY) or TOP for a bare limit; the
 * others use LIMIT/OFFSET.
 */
export const buildSelect = (spec: SqlSelectSpec, dialect: SqlDialect): BuiltSql => {
  const cols =
    spec.columns && spec.columns.length > 0 ? spec.columns.map((c) => quotePath(c, dialect)).join(', ') : '*';
  const distinct = spec.distinct ? 'DISTINCT ' : '';
  const where = buildWhere(spec.where, spec.whereCombinator ?? 'and', dialect, 1);

  const order =
    spec.orderBy && spec.orderBy.length > 0
      ? `ORDER BY ${spec.orderBy
          .filter((o) => o.column)
          .map((o) => `${quotePath(o.column, dialect)} ${o.direction === 'desc' ? 'DESC' : 'ASC'}`)
          .join(', ')}`
      : '';

  const lines: string[] = [];

  if (dialect === 'mssql' && spec.limit != null && !order) {
    // No ORDER BY → OFFSET/FETCH is illegal; use TOP.
    lines.push(`SELECT ${distinct}TOP (${Math.trunc(spec.limit)}) ${cols}`);
    lines.push(`FROM ${qualifiedTable(spec, dialect)}`);
    if (where.clause) lines.push(where.clause);
  } else {
    lines.push(`SELECT ${distinct}${cols}`);
    lines.push(`FROM ${qualifiedTable(spec, dialect)}`);
    if (where.clause) lines.push(where.clause);
    if (order) lines.push(order);
    if (dialect === 'mssql') {
      if (spec.offset != null || spec.limit != null) {
        lines.push(`OFFSET ${Math.trunc(spec.offset ?? 0)} ROWS`);
        if (spec.limit != null) lines.push(`FETCH NEXT ${Math.trunc(spec.limit)} ROWS ONLY`);
      }
    } else {
      if (spec.limit != null) lines.push(`LIMIT ${Math.trunc(spec.limit)}`);
      if (spec.offset != null) lines.push(`OFFSET ${Math.trunc(spec.offset)}`);
    }
  }

  return { sql: lines.join('\n'), params: where.params };
};

/** Escape a scalar for inline display (NOT for execution — use buildSelect's params). */
const inlineLiteral = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).split("'").join("''")}'`;
};

/**
 * A human-readable SQL string with values inlined — for the "copy query" button and
 * the editable preview. NOT safe to execute with untrusted values; the executor
 * always uses buildSelect()'s parameterized form.
 */
export const toInlineSql = (spec: SqlSelectSpec, dialect: SqlDialect): string => {
  const { sql, params } = buildSelect(spec, dialect);
  let i = 0;
  // Replace placeholders left-to-right with escaped literals. Each dialect's
  // placeholder form is distinct enough to match safely.
  const replaced = sql.replace(/\$\d+|@p\d+|\?/g, () => inlineLiteral(params[i++]));
  return `${replaced};`;
};
