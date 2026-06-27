/**
 * Pure validation for a task draft — the canonical, runtime-free gate (app's
 * UI and the `taskq` CLI both call it; nothing writes a malformed row). Returns
 * a list of human-readable problems; empty ⇒ valid.
 */

import type { NewTask } from './types';
import { MODEL_VALUES, TASK_SLUG_PATTERN, TASK_STATUSES, THINK_LEVELS } from './types';

export function validateNewTask(draft: NewTask): string[] {
  const errs: string[] = [];

  const title = (draft.title ?? '').trim();
  if (!title) errs.push('title is required');
  if (/[\r\n]/.test(draft.title ?? '')) errs.push('title must be a single line');

  if (draft.status != null && !TASK_STATUSES.includes(draft.status)) {
    errs.push(`invalid status: ${draft.status}`);
  }
  if (draft.slug != null && draft.slug !== '' && !TASK_SLUG_PATTERN.test(draft.slug)) {
    errs.push(`id "${draft.slug}" must match [A-Za-z0-9._-]`);
  }
  if (draft.group_key != null && draft.group_key !== '' && !TASK_SLUG_PATTERN.test(draft.group_key)) {
    errs.push(`group "${draft.group_key}" must match [A-Za-z0-9._-]`);
  }
  for (const n of draft.needs ?? []) {
    if (!TASK_SLUG_PATTERN.test(n)) errs.push(`needs id "${n}" must match [A-Za-z0-9._-]`);
  }
  if (draft.slug && (draft.needs ?? []).includes(draft.slug)) {
    errs.push('a task cannot depend on its own id');
  }
  // `auto` is accepted alongside the real aliases — it's the "assess me" sentinel
  // (classify-on-eligible writes back an explicit alias). See MODEL_VALUES.
  if (draft.model != null && draft.model !== '' && !(MODEL_VALUES as readonly string[]).includes(draft.model)) {
    errs.push(`unknown model alias "${draft.model}" (use ${MODEL_VALUES.join(', ')})`);
  }
  if (draft.think != null && draft.think !== '' && !(THINK_LEVELS as string[]).includes(draft.think)) {
    errs.push(`unknown thinking level "${draft.think}" (use ${THINK_LEVELS.join(', ')})`);
  }
  if (draft.recur_n != null && (!Number.isInteger(draft.recur_n) || draft.recur_n < 1)) {
    errs.push('recur cadence must be a positive integer');
  }
  if (
    draft.recur_interval_ms != null &&
    (!Number.isInteger(draft.recur_interval_ms) || draft.recur_interval_ms < 60_000)
  ) {
    errs.push('recur_interval_ms must be an integer ≥ 60000 (1 minute)');
  }
  if (draft.recur_n != null && draft.recur_interval_ms != null) {
    errs.push('use recur_n OR recur_interval_ms, not both');
  }
  if (draft.is_template && (draft.recur_n != null || draft.recur_interval_ms != null)) {
    errs.push('a template cannot have a recurrence schedule');
  }
  if (draft.max_attempts != null && (!Number.isInteger(draft.max_attempts) || draft.max_attempts < 1)) {
    errs.push('max_attempts must be a positive integer');
  }

  return errs;
}

/** Throw if a draft is invalid (CLI/engine guard). */
export function assertValidNewTask(draft: NewTask): void {
  const errs = validateNewTask(draft);
  if (errs.length) throw new Error(`invalid task: ${errs.join('; ')}`);
}
