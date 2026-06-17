import type { TaskqDb } from './types';

/**
 * Run `fn` inside an immediate write transaction: `BEGIN IMMEDIATE` grabs the
 * write lock up front so a multi-statement read-modify-write (claim a task +
 * insert its lease + claim group members) is atomic against other processes —
 * combined with `busy_timeout`, contenders queue instead of failing. Commits on
 * success, rolls back on throw.
 */
export function withTx<T>(db: TaskqDb, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // A rollback failure (e.g. no active txn) must not mask the original error.
    }
    throw e;
  }
}
