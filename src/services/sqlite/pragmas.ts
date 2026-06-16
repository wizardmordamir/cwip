// One place for the "tune SQLite for an app server" PRAGMA suite both sibling
// apps hand-roll. One set them all (WAL + NORMAL + busy_timeout + autocheckpoint
// + foreign_keys); the other only set WAL and silently missed the lock-wait and
// durability tuning. `applyRecommendedPragmas` makes the recommended baseline the
// default and each pragma individually configurable — pass `foreignKeys: true`
// to enforce referential integrity, or `null` on any field to skip emitting it.

import type { SqliteDatabaseLike } from './types';

export type SqliteJournalMode = 'WAL' | 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'OFF';
export type SqliteSynchronous = 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';

export interface SqlitePragmaOptions {
  /** `journal_mode`. Default `'WAL'` (concurrent reads + a single writer). `null` skips it. */
  journalMode?: SqliteJournalMode | null;
  /** `synchronous`. Default `'NORMAL'` (durable + fast paired with WAL). `null` skips it. */
  synchronous?: SqliteSynchronous | null;
  /** `busy_timeout` in ms: wait for a lock instead of failing `SQLITE_BUSY`. Default `5000`. `null` skips it. */
  busyTimeout?: number | null;
  /** `wal_autocheckpoint` in pages: bound `-wal` growth under sustained writes. Default `1000`. `null` skips it. */
  walAutocheckpoint?: number | null;
  /**
   * `foreign_keys` enforcement. Default `false` — SQLite's own per-connection
   * default, so cascades / RESTRICT only fire when an app opts in. Must be set
   * outside any transaction (it's a silent no-op inside one). `null` skips it.
   */
  foreignKeys?: boolean | null;
}

const assertInt = (name: string, value: number): number => {
  if (!Number.isInteger(value)) {
    throw new Error(`PRAGMA ${name} must be an integer, got ${value}`);
  }
  return value;
};

/**
 * Apply the recommended app-server PRAGMA baseline to a freshly opened SQLite
 * connection. Defaults: `journal_mode=WAL`, `synchronous=NORMAL`,
 * `busy_timeout=5000`, `wal_autocheckpoint=1000`, `foreign_keys=OFF`. Override
 * any of them, or pass `null` to leave that pragma untouched. Call once, on the
 * singleton connection, before opening any transaction.
 */
export const applyRecommendedPragmas = (db: SqliteDatabaseLike, options: SqlitePragmaOptions = {}): void => {
  const {
    journalMode = 'WAL',
    synchronous = 'NORMAL',
    busyTimeout = 5000,
    walAutocheckpoint = 1000,
    foreignKeys = false,
  } = options;

  if (journalMode !== null) db.run(`PRAGMA journal_mode = ${journalMode};`);
  if (synchronous !== null) db.run(`PRAGMA synchronous = ${synchronous};`);
  if (busyTimeout !== null) db.run(`PRAGMA busy_timeout = ${assertInt('busy_timeout', busyTimeout)};`);
  if (walAutocheckpoint !== null) {
    db.run(`PRAGMA wal_autocheckpoint = ${assertInt('wal_autocheckpoint', walAutocheckpoint)};`);
  }
  if (foreignKeys !== null) db.run(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'};`);
};
