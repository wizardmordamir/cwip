import type { SqlMockHandler } from './types';

// Normalize SQL for structural matching: lowercase, collapse whitespace, drop
// punctuation, and strip bound-parameter placeholders ($1, ?, :name, @name). What
// remains is the query's "skeleton" of keywords + identifiers, which is stable
// across differing literal values. Generalized (and decoupled from any auth
// specifics) from a sibling app's query-override matcher.
const STOPWORDS = new Set(['the', 'and', 'for']);

export const normalizeSql = (sql: string): string =>
  sql
    .toLowerCase()
    .replace(/\$\d+|\?|:[a-z_]\w*|@[a-z_]\w*/gi, ' ') // placeholders
    .replace(/[(),;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The ordered keyword/identifier tokens of a query (tokens >2 chars, minus stopwords). */
export const sqlKeywords = (sql: string): string[] =>
  normalizeSql(sql)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

/** Count the bound-parameter placeholders in a query ($1, ?, :name, @name). */
export const sqlParamCount = (sql: string): number => (sql.match(/\$\d+|\?|:[a-z_]\w*|@[a-z_]\w*/gi) ?? []).length;

const arraysEqual = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

interface CompiledHandler {
  handler: SqlMockHandler;
  keywords: string[];
  paramCount: number;
}

/**
 * Compile SQL handlers into a matcher. An incoming query matches a handler when
 * their keyword sequences are identical; ties are broken by an exact param-count
 * match. Handlers with more keywords are tried first (most specific wins).
 */
export const compileSqlMatcher = (
  handlers: SqlMockHandler[],
): ((sql: string, params?: unknown[]) => SqlMockHandler | null) => {
  const compiled: CompiledHandler[] = handlers
    .map((handler) => ({ handler, keywords: sqlKeywords(handler.query), paramCount: sqlParamCount(handler.query) }))
    .sort((a, b) => b.keywords.length - a.keywords.length);

  return (sql, params = []) => {
    const keywords = sqlKeywords(sql);
    const matches = compiled.filter((c) => arraysEqual(c.keywords, keywords));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0].handler;
    return (matches.find((c) => c.paramCount === params.length) ?? matches[0]).handler;
  };
};
