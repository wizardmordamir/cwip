/**
 * Pure recurrence math. A recurring task (`recur_n` set) runs only after the
 * queue's completion count has advanced `recur_n` past its last run — and (per
 * the scheduler) only once no one-shot work remains. It never becomes `done`;
 * completing it bumps `recur_last` and returns it to `ready`.
 */

import type { TaskRow } from './types';

export function isRecurring(task: Pick<TaskRow, 'recur_n'>): boolean {
  return task.recur_n != null;
}

/**
 * Is a recurring task off cooldown, given the global completion count? A task
 * that has never run (`recur_last` unset) is due immediately — it runs once
 * after the one-shots, then waits `recur_n` completions between runs.
 */
export function isRecurDue(task: Pick<TaskRow, 'recur_n' | 'recur_last'>, completedCount: number): boolean {
  if (task.recur_n == null) return false;
  if (task.recur_last == null) return true;
  return completedCount - task.recur_last >= task.recur_n;
}
