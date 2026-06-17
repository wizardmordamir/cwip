import type { TaskqDb } from './types';

export interface DrainRun {
  id: number;
  started_at: number;
  ended_at: number | null;
  decision: string;
  reason: string;
  jobs: number;
  max_jobs: number;
  completed: number | null;
  failed: number | null;
  reaped: number | null;
}

export function insertDrainRun(
  db: TaskqDb,
  r: { startedAt: number; decision: string; reason: string; jobs: number; maxJobs: number },
): number {
  return (
    db.run(
      `INSERT INTO drain_runs (started_at, decision, reason, jobs, max_jobs) VALUES (?, ?, ?, ?, ?)`,
      r.startedAt,
      r.decision,
      r.reason,
      r.jobs,
      r.maxJobs,
    ) as { lastInsertRowid: number }
  ).lastInsertRowid as unknown as number;
}

export function finishDrainRun(
  db: TaskqDb,
  id: number,
  r: { endedAt: number; completed: number; failed: number; reaped: number },
): void {
  db.run(
    `UPDATE drain_runs SET ended_at = ?, completed = ?, failed = ?, reaped = ? WHERE id = ?`,
    r.endedAt,
    r.completed,
    r.failed,
    r.reaped,
    id,
  );
}

export function listDrainRuns(db: TaskqDb, limit = 50): DrainRun[] {
  return db.query(`SELECT * FROM drain_runs ORDER BY started_at DESC LIMIT ?`).all(limit) as DrainRun[];
}
