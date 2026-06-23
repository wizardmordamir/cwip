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
  {
    // Token accounting: rolling-window usage buckets + a per-event ledger. The
    // orchestrator records each run's (model-weighted) cost; remaining capacity
    // is `limit − Σ(units in the window)`. Manual `/usage` calibration inserts a
    // sized 'manual' event (which ages out of the rolling window on its own) and
    // may set the limit + reset_at.
    version: 2,
    up: (db) => {
      db.exec(`
        CREATE TABLE limit_buckets (
          key            TEXT    PRIMARY KEY,
          limit_units    REAL    NOT NULL,
          window_seconds INTEGER NOT NULL,
          reset_at       INTEGER,
          calibrated_at  INTEGER
        );
      `);
      db.exec(`
        CREATE TABLE usage_ledger (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          at         INTEGER NOT NULL,
          bucket_key TEXT    NOT NULL,
          units      REAL    NOT NULL,
          model      TEXT,
          source     TEXT    NOT NULL DEFAULT 'run'
        );
      `);
      db.exec(`CREATE INDEX idx_usage_bucket_at ON usage_ledger(bucket_key, at);`);
      // Seed the three Max-plan windows with placeholder limits (calibrate to real).
      db.run(
        `INSERT INTO limit_buckets(key, limit_units, window_seconds) VALUES ('session_5h', ?, ?)`,
        1_000_000,
        18_000,
      );
      db.run(
        `INSERT INTO limit_buckets(key, limit_units, window_seconds) VALUES ('weekly_total', ?, ?)`,
        5_000_000,
        604_800,
      );
      db.run(
        `INSERT INTO limit_buckets(key, limit_units, window_seconds) VALUES ('weekly_sonnet', ?, ?)`,
        2_000_000,
        604_800,
      );
    },
  },
  {
    // Add session_id to usage_ledger for JSONL-ingest dedup: a unique partial index
    // on (session_id, bucket_key) prevents the same drain-task result being counted
    // twice across watchdog polls. NULL session_ids (manual calibrations) are
    // unconstrained — SQLite partial indexes exclude NULLs by default.
    version: 3,
    up: (db) => {
      db.exec(`ALTER TABLE usage_ledger ADD COLUMN session_id TEXT`);
      db.exec(
        `CREATE UNIQUE INDEX idx_usage_session_bucket ON usage_ledger(session_id, bucket_key) WHERE session_id IS NOT NULL`,
      );
    },
  },
  {
    // Clarification gateways for the no-stall user-input loop (epic decomposition):
    // an ambiguous task is parked `needs_input` with a question here; the
    // orchestrator skips it (it isn't `ready`) and works other tasks meanwhile.
    version: 4,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS clarifications (
          task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          question    TEXT    NOT NULL,
          asked_at    INTEGER NOT NULL,
          answered_at INTEGER,
          answer      TEXT,
          PRIMARY KEY (task_id)
        );
      `);
    },
  },
  {
    // Dual-track scheduling: time-based recurring tasks + saved templates.
    //   recur_interval_ms — interval in milliseconds (null = count-based or one-shot).
    //   recur_next_at     — epoch-ms when this recurring task next becomes eligible.
    //   is_template       — 1 = template (never auto-claimed; users enqueue copies manually).
    version: 5,
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN recur_interval_ms INTEGER`);
      db.exec(`ALTER TABLE tasks ADD COLUMN recur_next_at INTEGER`);
      db.exec(`ALTER TABLE tasks ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0`);
    },
  },
  {
    // Drain run audit log: records each drain pass decision, worker counts, and
    // outcome (completed/failed/reaped). Powers the "Drain history" panel in the
    // Workers tab — answers "it ran a minute ago, why didn't it start a task?"
    version: 6,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS drain_runs (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          ended_at   INTEGER,
          decision   TEXT    NOT NULL,
          reason     TEXT    NOT NULL,
          jobs       INTEGER NOT NULL DEFAULT 0,
          max_jobs   INTEGER NOT NULL DEFAULT 0,
          completed  INTEGER,
          failed     INTEGER,
          reaped     INTEGER
        );
      `);
    },
  },
  {
    // Repair: session_id was added to usage_ledger in migration v3, but that
    // migration was inserted after some databases were already at v6 — the
    // version check (v3 < current=6) skipped it on those DBs. This v7 migration
    // applies the column + index unconditionally if still missing, making it safe
    // for both old (missing) and new (already present) databases.
    version: 7,
    up: (db) => {
      const cols = db.query(`PRAGMA table_info(usage_ledger)`).all() as { name: string }[];
      if (!cols.some((c) => c.name === 'session_id')) {
        db.exec(`ALTER TABLE usage_ledger ADD COLUMN session_id TEXT`);
        db.exec(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_session_bucket ON usage_ledger(session_id, bucket_key) WHERE session_id IS NOT NULL`,
        );
      }
    },
  },
  {
    // Saved tasks: a task marked is_saved=1 returns to on_hold after completion
    // (instead of done) so it persists as a reusable/manually-triggered task.
    // Combined with recur_interval_ms it auto-schedules; without an interval it
    // sits in on_hold until the user queues it again. Replaces the legacy
    // count-based recur_n pattern.
    version: 8,
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN is_saved INTEGER NOT NULL DEFAULT 0`);
    },
  },
  {
    // Serial-execution groups: tasks in the same serial_group run one at a time.
    // The orchestrator skips a task when another member of its serial_group is
    // currently `claimed`. No status changes needed — the eligibility check is
    // a simple NOT EXISTS on the claimed sibling.
    version: 9,
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN serial_group TEXT`);
      db.exec(`CREATE INDEX idx_tasks_serial_group ON tasks(serial_group)`);
    },
  },
  {
    // Bounded auto-retry with backoff (worker resilience). A failed/reaped task
    // is re-queued up to `max_attempts` times before parking terminal `failed`:
    //   attempts     — failures so far (incremented on explicit failure AND lease-reap).
    //   max_attempts — per-task override of the config default (null = use default).
    // The backoff "not eligible until" timestamp reuses the existing recur_next_at
    // column (the claim query honors it across all eligibility branches) and the
    // failure reason reuses `note` — so no new scheduling/eligibility plumbing.
    version: 10,
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`);
      db.exec(`ALTER TABLE tasks ADD COLUMN max_attempts INTEGER`);
    },
  },
  {
    // Structured hold-disposition: every PARKED task declares WHO unblocks it and
    // WHEN (machine-set, not free-text), so a park can never silently strand a task
    // (the rfc-31j bug: a false-done reverted to a bare on_hold — no retry, no heal —
    // while blocking its dependents).
    //   hold_disposition — {needs_owner | awaiting_task | awaiting_retry | awaiting_dependency}.
    //   resolver_ref     — slug/id of the resolving task/dep (awaiting_task / awaiting_dependency).
    // The retry time for `awaiting_retry` reuses the existing recur_next_at column
    // (the backoff already writes it) — no new scheduling plumbing.
    //
    // One-time BACKFILL: classify every already-parked row that predates this column
    // so the board isn't full of unclassified holds. `blocked` → awaiting_dependency
    // (resolver = its unmet, non-done `needs:` slugs); every other parked status →
    // needs_owner (the safe default — a human triages it). Only touches rows where
    // hold_disposition IS NULL, so it's idempotent and additive.
    version: 11,
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN hold_disposition TEXT`);
      db.exec(`ALTER TABLE tasks ADD COLUMN resolver_ref TEXT`);

      // blocked → awaiting_dependency, with the unmet (non-done) needs slugs as the resolver.
      db.run(
        `UPDATE tasks SET hold_disposition = 'awaiting_dependency',
           resolver_ref = (
             SELECT group_concat(d.needs_slug, ',')
               FROM task_deps d JOIN tasks x ON x.slug = d.needs_slug AND x.status <> 'done'
              WHERE d.task_id = tasks.id
           )
         WHERE status = 'blocked' AND hold_disposition IS NULL`,
      );
      // Every other parked status with no disposition yet → needs_owner (a human triages it).
      db.run(
        `UPDATE tasks SET hold_disposition = 'needs_owner'
         WHERE status IN ('on_hold', 'needs_input', 'not_ready', 'failed') AND hold_disposition IS NULL`,
      );
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
