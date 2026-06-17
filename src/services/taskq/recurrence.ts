/**
 * Pure recurrence math.
 *
 * Count-based (legacy `recur_n`): runs only after the queue's completion count
 * has advanced `recur_n` past its last run, and only once no one-shot work
 * remains.
 *
 * Time-based (`recur_interval_ms`): runs on a wall-clock schedule; eligible
 * once `recur_next_at` has passed (or immediately if never run). Both modes
 * return to `ready` after completion — they never become `done`.
 */

import type { TaskRow } from './types';

export function isRecurring(task: Pick<TaskRow, 'recur_n'>): boolean {
  return task.recur_n != null;
}

/**
 * Is a count-based recurring task off cooldown, given the global completion
 * count? A task that has never run (`recur_last` unset) is due immediately.
 */
export function isRecurDue(task: Pick<TaskRow, 'recur_n' | 'recur_last'>, completedCount: number): boolean {
  if (task.recur_n == null) return false;
  if (task.recur_last == null) return true;
  return completedCount - task.recur_last >= task.recur_n;
}

/** True when the task uses time-based recurrence (not count-based). */
export function isTimeBased(task: Pick<TaskRow, 'recur_interval_ms'>): boolean {
  return task.recur_interval_ms != null;
}

/**
 * Is a time-based recurring task due given the current epoch-ms? A task that
 * has never run (`recur_next_at` null) is due immediately.
 */
export function isTimeRecurDue(task: Pick<TaskRow, 'recur_interval_ms' | 'recur_next_at'>, nowMs: number): boolean {
  if (task.recur_interval_ms == null) return false;
  if (task.recur_next_at == null) return true;
  return nowMs >= task.recur_next_at;
}

/** Compute the next eligible epoch-ms for a time-based recurring task. */
export function nextRecurAt(intervalMs: number, nowMs: number): number {
  return nowMs + intervalMs;
}
