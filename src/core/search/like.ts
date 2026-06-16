// The escape character to pair with the patterns below in an `ESCAPE` clause.
export const LIKE_ESCAPE = '\\';

/**
 * Escape the SQL `LIKE` wildcards (`%`, `_`) and the escape char itself in a
 * user-supplied query, so they're matched literally instead of as wildcards.
 * Without this, a user searching "50%" or "a_b" silently matches far more than
 * intended. Pair the result with an `ESCAPE` clause using {@link LIKE_ESCAPE}.
 */
export const escapeLike = (query: string): string => query.replace(/[\\%_]/g, (ch) => `${LIKE_ESCAPE}${ch}`);

/**
 * A `%…%` "contains" pattern for a SQL `LIKE`, with the query's wildcards escaped.
 * Use with an escape clause, e.g. (SQLite/Postgres):
 *   `WHERE col LIKE ? ESCAPE '\\'`  — bind `likePattern(userQuery)`.
 */
export const likePattern = (query: string): string => `%${escapeLike(query)}%`;
