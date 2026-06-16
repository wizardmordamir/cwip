// The minimal structural surface these helpers need from a synchronous SQLite
// driver. Bun's `bun:sqlite` `Database` satisfies it directly (`db.query(sql)`
// + `db.run(sql)`), so the helpers stay runtime-agnostic and cwip keeps its
// zero-dependency, no-driver-coupling contract — the consuming app passes
// whichever handle it already opened, and cwip never imports `bun:sqlite`.

/** A prepared statement; only `.all()` is used here (for `PRAGMA table_info`). */
export interface SqliteStatementLike {
  all(...params: unknown[]): unknown[];
}

/** The bun:sqlite-shaped `Database` surface these helpers rely on. */
export interface SqliteDatabaseLike {
  /** Prepare a query statement (used for `PRAGMA table_info(...)`). */
  query(sql: string): SqliteStatementLike;
  /** Execute a statement that returns no rows (DDL / `PRAGMA` writes). */
  run(sql: string): unknown;
}
