import { type AiComplete, buildAskPrompt, parseAiTable } from './ai';
import type { TabularAggregate, TabularCompare, TabularOp, TabularTable } from './types';

/**
 * Apply an ordered list of `TabularOp`s to a table — the pure transform engine
 * behind spreadsheet/CSV automation features. No filesystem, no deps; file IO and xlsx parsing live in the
 * caller's adapter (`cwip/excel`, an app's server layer). Ops referencing
 * unknown columns are no-ops, not crashes — a pipeline shouldn't die because
 * an upstream sheet dropped a column.
 */
export interface ApplyTabularOptions {
  /** Required only when the operation list contains an `askAi` step. */
  ai?: AiComplete;
}

const colIndex = (table: TabularTable, name: string): number => table.columns.indexOf(name);

/** Numeric-aware comparison: numbers when both sides parse, else string. */
const compareValues = (a: string, b: string): number => {
  const na = Number(a);
  const nb = Number(b);
  if (a.trim() !== '' && b.trim() !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a < b ? -1 : a > b ? 1 : 0;
};

/** Case-insensitive membership of `cell` in `values`. */
const inList = (cell: string, values: string[]): boolean => {
  const lower = cell.toLowerCase();
  return values.some((v) => v.toLowerCase() === lower);
};

const matches = (cell: string, compare: TabularCompare, value: string, values: string[] = []): boolean => {
  switch (compare) {
    case 'eq':
      return cell === value;
    case 'neq':
      return cell !== value;
    case 'contains':
      return cell.toLowerCase().includes(value.toLowerCase());
    case 'gt':
      return compareValues(cell, value) > 0;
    case 'lt':
      return compareValues(cell, value) < 0;
    case 'gte':
      return compareValues(cell, value) >= 0;
    case 'lte':
      return compareValues(cell, value) <= 0;
    case 'empty':
      return cell.trim() === '';
    case 'notEmpty':
      return cell.trim() !== '';
    case 'in':
      return inList(cell, values);
    case 'notIn':
      return !inList(cell, values);
  }
};

// ── group ────────────────────────────────────────────────────────────────────

const aggregateName = (agg: TabularAggregate): string =>
  agg.as ?? (agg.fn === 'count' ? 'count' : `${agg.fn}(${agg.column ?? ''})`);

const numbersIn = (values: string[]): number[] =>
  values.map((v) => Number(v)).filter((n, i) => values[i].trim() !== '' && !Number.isNaN(n));

const aggregate = (values: string[], agg: TabularAggregate): string => {
  switch (agg.fn) {
    case 'count':
      return String(values.length);
    case 'first':
      return values[0] ?? '';
    case 'concat':
      return values.filter((v) => v !== '').join(', ');
    case 'sum':
    case 'avg': {
      const nums = numbersIn(values);
      if (nums.length === 0) {
        return '';
      }
      const sum = nums.reduce((a, b) => a + b, 0);
      return String(agg.fn === 'sum' ? sum : sum / nums.length);
    }
    case 'min':
    case 'max': {
      if (values.length === 0) {
        return '';
      }
      const sign = agg.fn === 'min' ? -1 : 1;
      return values.reduce((best, v) => (sign * compareValues(v, best) > 0 ? v : best));
    }
  }
};

const groupRows = (table: TabularTable, by: string[], aggregates: TabularAggregate[]): TabularTable => {
  const byIdx = by.map((c) => colIndex(table, c)).filter((i) => i >= 0);
  if (byIdx.length === 0) {
    return table; // unknown group columns — no-op like the other ops
  }
  const aggs = aggregates.length ? aggregates : [{ fn: 'count' } as TabularAggregate];
  const groups = new Map<string, string[][]>();
  for (const row of table.rows) {
    const key = JSON.stringify(byIdx.map((i) => row[i] ?? ''));
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(key, [row]);
    }
  }
  const columns = [...byIdx.map((i) => table.columns[i]), ...aggs.map(aggregateName)];
  const rows = [...groups.entries()].map(([key, bucket]) => {
    const keyValues = JSON.parse(key) as string[];
    const aggValues = aggs.map((agg) => {
      const i = agg.column ? colIndex(table, agg.column) : -1;
      const values = agg.fn === 'count' && i < 0 ? bucket.map(() => '') : bucket.map((r) => r[i] ?? '');
      return aggregate(values, agg);
    });
    return [...keyValues, ...aggValues];
  });
  return { columns, rows };
};

// ── apply ────────────────────────────────────────────────────────────────────

const applyOp = async (table: TabularTable, op: TabularOp, opts: ApplyTabularOptions): Promise<TabularTable> => {
  switch (op.op) {
    case 'select': {
      const idxs = op.columns.map((c) => colIndex(table, c)).filter((i) => i >= 0);
      return { columns: idxs.map((i) => table.columns[i]), rows: table.rows.map((r) => idxs.map((i) => r[i])) };
    }
    case 'rename':
      return { ...table, columns: table.columns.map((c) => op.rename[c] ?? c) };
    case 'filter': {
      const i = colIndex(table, op.column);
      if (i < 0) {
        return table;
      }
      return { ...table, rows: table.rows.filter((r) => matches(r[i] ?? '', op.compare, op.value ?? '', op.values)) };
    }
    case 'sort': {
      const i = colIndex(table, op.column);
      if (i < 0) {
        return table;
      }
      const sign = op.dir === 'desc' ? -1 : 1;
      const rows = [...table.rows].sort((a, b) => sign * compareValues(a[i] ?? '', b[i] ?? ''));
      return { ...table, rows };
    }
    case 'group':
      return groupRows(table, op.by, op.aggregates ?? []);
    case 'limit':
      return { ...table, rows: table.rows.slice(0, Math.max(0, op.count)) };
    case 'askAi': {
      if (!opts.ai) {
        throw new Error('tabular "askAi" step needs an AiComplete — pass { ai } in ApplyTabularOptions');
      }
      const format = op.responseFormat ?? 'csv';
      const reply = await opts.ai(buildAskPrompt(table, op.question, format));
      return parseAiTable(reply, format);
    }
  }
};

/** Fold an ordered list of operations over a table (sequential — `askAi` is async). */
export const applyTabularOps = async (
  table: TabularTable,
  ops: TabularOp[],
  opts: ApplyTabularOptions = {},
): Promise<TabularTable> => {
  let result = table;
  for (const op of ops) {
    result = await applyOp(result, op, opts);
  }
  return result;
};
