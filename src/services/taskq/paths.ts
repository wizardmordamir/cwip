/**
 * Resolve the taskq storage location. Portable + machine-independent: defaults
 * to `~/.taskq/` so a fresh box re-creates the same path with no workspace.
 *   - `TASKQ_HOME` overrides the directory.
 *   - `TASKQ_DB` overrides the DB path directly (a plain path or a `file:` URI,
 *     so an app can point at it via a connection string).
 */

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/** The taskq home dir (holds the DB, config, run logs). */
export function taskqHome(): string {
  const env = process.env.TASKQ_HOME?.trim();
  return env ? resolve(env) : join(homedir(), '.taskq');
}

/** The SQLite DB file path (strips a `file:` scheme + query string if present). */
export function taskqDbPath(): string {
  const env = process.env.TASKQ_DB?.trim();
  if (env) return resolve(env.replace(/^file:/, '').replace(/\?.*$/, ''));
  return join(taskqHome(), 'taskq.sqlite');
}
