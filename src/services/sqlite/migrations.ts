// Schema-less, framework-free SQLite migration helpers. Both sibling apps drive
// their schema with `CREATE TABLE IF NOT EXISTS` + idempotent, additive
// `ALTER TABLE … ADD COLUMN` guarded by `PRAGMA table_info`. One app had
// extracted a local `addColumnIfMissing`; the other inlined the same
// `!cols.some(c => c.name === x)` guard a dozen times. These are the shared,
// dependency-free primitives so an app's DB-init reads as schema, not bookkeeping.

import type { SqliteDatabaseLike } from './types';

interface PragmaTableInfoRow {
  name: string;
}

// SQLite identifiers can't be bound as parameters, so table/column names are
// interpolated into PRAGMA / ALTER statements. They're developer-controlled
// constants in practice, but validating them keeps a stray value from smuggling
// SQL through the interpolation. Column *definitions* (e.g. `TEXT NOT NULL
// DEFAULT 0`) are deliberately NOT validated — they're arbitrary DDL fragments.
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const assertIdentifier = (kind: 'table' | 'column', value: string): void => {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid SQLite ${kind} identifier: ${JSON.stringify(value)}`);
  }
};

// Double-quote a (validated) identifier so reserved words (`order`, `group`, …)
// are legal in the emitted SQL. Safe because IDENTIFIER already forbids quotes,
// and `PRAGMA table_info` still reports the *unquoted* name, so comparisons hold.
const quote = (value: string): string => `"${value}"`;

/**
 * Column names of `table`, in declared order. Returns `[]` when the table does
 * not exist (SQLite's `PRAGMA table_info` yields no rows for an unknown table,
 * and every real table has at least one column — so an empty result reliably
 * means "absent").
 */
export const getColumnNames = (db: SqliteDatabaseLike, table: string): string[] => {
  assertIdentifier('table', table);
  const rows = db.query(`PRAGMA table_info(${quote(table)})`).all() as PragmaTableInfoRow[];
  return rows.map((row) => row.name);
};

/** Whether `table` exists in the database. */
export const tableExists = (db: SqliteDatabaseLike, table: string): boolean => getColumnNames(db, table).length > 0;

/** Whether `column` already exists on `table` (false if the table is absent). */
export const columnExists = (db: SqliteDatabaseLike, table: string, column: string): boolean => {
  assertIdentifier('column', column);
  return getColumnNames(db, table).includes(column);
};

/**
 * Idempotent additive migration: `ALTER TABLE <table> ADD COLUMN <column>
 * <definition>` — but only when the table exists and the column is absent.
 * Returns `true` if a column was added, `false` if it already existed or the
 * table doesn't exist yet. Safe to call on every startup; safe to call before a
 * table is created (it no-ops instead of throwing), which matches the guarded
 * `if (cols.length && !cols.some(…))` form some migrations use.
 */
export const addColumnIfMissing = (
  db: SqliteDatabaseLike,
  table: string,
  column: string,
  definition: string,
): boolean => {
  assertIdentifier('column', column);
  const columns = getColumnNames(db, table);
  if (columns.length === 0 || columns.includes(column)) return false;
  db.run(`ALTER TABLE ${quote(table)} ADD COLUMN ${quote(column)} ${definition}`);
  return true;
};
