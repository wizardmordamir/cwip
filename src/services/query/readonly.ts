// Defense-in-depth read-only guard for hand-written / generated SQL. This is a
// conservative lexical check, NOT a full parser: the real guarantee is read-only
// DB credentials + the executor only running SELECT. It blocks the obvious foot-guns
// (DROP/DELETE/UPDATE/INSERT/…) and multi-statement payloads before they reach a DB.

// Statement keywords that mutate data/schema or run procedures.
const FORBIDDEN = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'truncate',
  'create',
  'grant',
  'revoke',
  'merge',
  'replace',
  'exec',
  'execute',
  'call',
  'attach',
  'pragma',
];

/** Strip -- line comments and /* *​/ block comments, collapse whitespace, lowercase. */
const normalize = (sql: string): string =>
  sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * True if `sql` is a single read-only statement (SELECT, or a WITH … SELECT CTE).
 * Rejects multiple statements, SELECT … INTO, and any forbidden keyword as a word.
 */
export const isReadOnlySql = (sql: string): boolean => {
  const s = normalize(sql);
  if (!s) return false;

  // No stacked statements: a ';' may only appear as a trailing terminator.
  const withoutTrailing = s.replace(/;\s*$/, '');
  if (withoutTrailing.includes(';')) return false;

  // Must start with select or a CTE (with).
  if (!/^(select|with)\b/.test(withoutTrailing)) return false;

  // `SELECT … INTO new_table` writes — block it.
  if (/\bselect\b[\s\S]*\binto\b/.test(withoutTrailing)) return false;

  // No forbidden keyword anywhere (as a whole word).
  for (const kw of FORBIDDEN) {
    if (new RegExp(`\\b${kw}\\b`).test(withoutTrailing)) return false;
  }
  return true;
};

export class WriteQueryBlockedError extends Error {
  constructor(message = 'Only read-only (SELECT) queries are allowed on this connection') {
    super(message);
    this.name = 'WriteQueryBlockedError';
  }
}

/** Throw WriteQueryBlockedError unless `sql` passes isReadOnlySql. */
export const assertReadOnlySql = (sql: string): void => {
  if (!isReadOnlySql(sql)) throw new WriteQueryBlockedError();
};
