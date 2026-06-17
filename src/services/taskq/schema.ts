/**
 * Schema + a tiny forward-only migration runner. {@link migrate} is idempotent:
 * it tracks the applied version in `taskq_meta` and runs each pending step in a
 * transaction. Later phases (usage ledger, clarifications, runs) add steps here
 * rather than editing the v1 DDL.
 */

import { withTx } from './tx';
import type { TaskqDb } from './types';

interface Migration {
  version: number;
  up: (db: TaskqDb) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE tasks (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          ord          REAL    NOT NULL,
          status       TEXT    NOT NULL DEFAULT 'ready',
          slug         TEXT    UNIQUE,
          title        TEXT    NOT NULL,
          body         TEXT,
          repo         TEXT,
          model        TEXT,
          think        TEXT,
          fast         INTEGER NOT NULL DEFAULT 0,
          group_key    TEXT,
          recur_n      INTEGER,
          recur_last   INTEGER,
          parent_id    INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
          note         TEXT,
          triage_state TEXT,
          complexity   TEXT,
          created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
      `);
      db.exec(`CREATE INDEX idx_tasks_status_ord ON tasks(status, ord);`);
      db.exec(`CREATE INDEX idx_tasks_group ON tasks(group_key);`);

      // Dependencies by SLUG (not row id) so a `needs:X` added before X exists
      // still works, and "satisfied" = no non-done task carries that slug.
      db.exec(`
        CREATE TABLE task_deps (
          task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          needs_slug TEXT    NOT NULL,
          PRIMARY KEY (task_id, needs_slug)
        );
      `);
      db.exec(`CREATE INDEX idx_task_deps_needs ON task_deps(needs_slug);`);

      // A claim is a lease (epoch-ms timestamps); the reaper reclaims expired ones.
      db.exec(`
        CREATE TABLE leases (
          task_id      INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
          worker_id    TEXT    NOT NULL,
          worktree     TEXT,
          claimed_at   INTEGER NOT NULL,
          heartbeat_at INTEGER NOT NULL,
          expires_at   INTEGER NOT NULL
        );
      `);

      db.exec(`
        CREATE TABLE completions (
          task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title      TEXT    NOT NULL,
          repo       TEXT,
          "commit"   TEXT,
          started_at INTEGER,
          ended_at   INTEGER NOT NULL,
          duration_s INTEGER,
          summary    TEXT
        );
      `);
      db.exec(`CREATE INDEX idx_completions_task ON completions(task_id);`);
    },
  },
];

/** The latest schema version (the version the engine expects). */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Bring `db` up to {@link SCHEMA_VERSION}, applying only pending migrations.
 * Safe to call on every open. Returns the resulting version.
 */
export function migrate(db: TaskqDb): number {
  db.exec(`CREATE TABLE IF NOT EXISTS taskq_meta (key TEXT PRIMARY KEY, value TEXT);`);
  const row = db.query(`SELECT value FROM taskq_meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined
    | null;
  let current = row ? Number(row.value) : 0;

  for (const m of MIGRATIONS) {
    if (m.version > current) {
      withTx(db, () => m.up(db));
      current = m.version;
    }
  }

  db.run(
    `INSERT INTO taskq_meta(key, value) VALUES('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    String(current),
  );
  return current;
}
