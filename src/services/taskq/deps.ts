/**
 * Dependency gating. A `needs:X` is unmet while some task carries slug `X` and
 * isn't `done` (matching the old board's "blocked while id:X still exists"); a
 * `needs:` whose slug exists nowhere is treated as already-met (a typo'd id just
 * runs). Deps are stored by slug, so they work even if added before the target.
 */

import type { TaskqDb } from './types';

/** True when every `needs:` slug of `taskId` points at a done/absent task. */
export function depsSatisfied(db: TaskqDb, taskId: number): boolean {
  const row = db
    .query(
      `SELECT COUNT(*) AS c
         FROM task_deps d
         JOIN tasks t ON t.slug = d.needs_slug AND t.status <> 'done'
        WHERE d.task_id = ?`,
    )
    .get(taskId) as { c: number };
  return (row?.c ?? 0) === 0;
}
