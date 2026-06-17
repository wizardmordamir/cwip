/**
 * Clarification gateways — the "no-stall user-input loop". An ambiguous (usually
 * epic) task is parked `needs_input` with a question stored here; the UI surfaces
 * it as an Input Queue. Storing/answering is just Q&A bookkeeping — flipping the
 * task tree on an answer is orchestration logic (the consumer's resolveGateway).
 */

import type { TaskqDb } from './types';

export interface Clarification {
  task_id: number;
  question: string;
  asked_at: number;
  answered_at: number | null;
  answer: string | null;
}

/** An open gateway joined with its task's title (for the Input Queue). */
export interface OpenClarification {
  task_id: number;
  title: string;
  question: string;
  asked_at: number;
}

/** Record (or replace) the clarification question for a task. */
export function addClarification(db: TaskqDb, taskId: number, question: string, at: number): void {
  db.run(
    `INSERT INTO clarifications (task_id, question, asked_at) VALUES (?, ?, ?)
     ON CONFLICT(task_id) DO UPDATE SET question = excluded.question, asked_at = excluded.asked_at,
       answered_at = NULL, answer = NULL`,
    taskId,
    question,
    at,
  );
}

/** Record the user's answer (does not itself change task status). */
export function answerClarification(db: TaskqDb, taskId: number, answer: string, at: number): void {
  const res = db.run(`UPDATE clarifications SET answer = ?, answered_at = ? WHERE task_id = ?`, answer, at, taskId);
  if (res.changes === 0) throw new Error(`no clarification for task ${taskId}`);
}

export function getClarification(db: TaskqDb, taskId: number): Clarification | null {
  return (
    (db.query(`SELECT * FROM clarifications WHERE task_id = ?`).get(taskId) as Clarification | undefined | null) ?? null
  );
}

/** Unanswered gateways on `needs_input` tasks — the Input Queue. */
export function openClarifications(db: TaskqDb): OpenClarification[] {
  return db
    .query(
      `SELECT c.task_id, t.title, c.question, c.asked_at
         FROM clarifications c JOIN tasks t ON t.id = c.task_id
        WHERE c.answered_at IS NULL AND t.status = 'needs_input'
        ORDER BY c.asked_at ASC`,
    )
    .all() as OpenClarification[];
}
