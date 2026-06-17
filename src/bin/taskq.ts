#!/usr/bin/env bun
/**
 * `taskq` — the agent-facing CLI for the SQLite task queue (engine: cwip/taskq).
 * Replaces "edit a line in TASKS.md": workers/orchestrator call these verbs, which
 * run atomic engine operations against `~/.taskq/taskq.sqlite` (WAL). Machine verbs
 * (`next`, `claim-next`) print JSON; mutations print a short confirmation.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { applyRecommendedPragmas } from '../services/sqlite';
import {
  addTask,
  claim,
  claimNext,
  completeTask,
  deleteTask,
  failTask,
  getNeeds,
  getTask,
  heartbeat,
  listTasks,
  migrate,
  moveTask,
  type NewTask,
  nextEligibleId,
  type Position,
  reapExpired,
  releaseLease,
  renderTasksMarkdown,
  SCHEMA_VERSION,
  setStatus,
  type TaskPatch,
  type TaskqDb,
  taskqDbPath,
  taskqHome,
  updateTask,
} from '../services/taskq';

const USAGE = `taskq — SQLite task queue

Queue:
  taskq ls [--status S] [--json]          list tasks
  taskq show <id> [--json]                show one task
  taskq next [--repo R] [--model A,B]     print the next eligible task (no claim)
  taskq view [--write [path]]             render the markdown mirror (default ~/.taskq/TASKS.view.md)

Author:
  taskq add "<title>" [opts]              create a task → prints its id
  taskq update <id> [opts]                patch a task
  taskq hold <id> [--note T] | unhold <id>
  taskq status <id> <state> [--note T]    set status (ready|on_hold|not_ready|pending_triage|…)
  taskq rm <id>

Run (orchestrator/worker):
  taskq claim-next --worker W [--worktree S] [--repo R] [--model A,B] [--ttl MS]
  taskq claim <id> --worker W [--worktree S] [--ttl MS]
  taskq complete <id> [--commit SHA] [--summary T] [--duration S] [--started MS]
  taskq fail <id> --reason T
  taskq release <id> | heartbeat <id> | reap
  taskq init                              create/migrate the DB

Author opts: --body --slug --repo --model --think --group --recur N --needs a,b --note --status
             --fast   --pos top|bottom|before:<id>|after:<id>
`;

type Flags = Record<string, string | boolean>;

function parseFlags(args: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

const str = (f: Flags, k: string): string | undefined => (typeof f[k] === 'string' ? (f[k] as string) : undefined);
const num = (f: Flags, k: string): number | undefined => {
  const v = str(f, k);
  return v == null ? undefined : Number(v);
};

function openDb(): TaskqDb {
  const path = taskqDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path) as unknown as TaskqDb;
  applyRecommendedPragmas(db, { foreignKeys: true });
  migrate(db);
  return db;
}

/** Build a NewTask/patch from author flags (shared by add + update). */
function draftFromFlags(f: Flags): NewTask & TaskPatch {
  const d: NewTask & TaskPatch = { title: str(f, 'title') ?? '' };
  if (f.body !== undefined) d.body = str(f, 'body') ?? '';
  if (f.slug !== undefined) d.slug = str(f, 'slug');
  if (f.repo !== undefined) d.repo = str(f, 'repo');
  if (f.model !== undefined) d.model = str(f, 'model');
  if (f.think !== undefined) d.think = str(f, 'think');
  if (f.group !== undefined) d.group_key = str(f, 'group');
  if (f.recur !== undefined) d.recur_n = num(f, 'recur');
  if (f.note !== undefined) d.note = str(f, 'note');
  if (f.status !== undefined) d.status = str(f, 'status') as NewTask['status'];
  if (f.fast !== undefined) d.fast = true;
  if (f.needs !== undefined) {
    d.needs = (str(f, 'needs') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return d;
}

/** Parse `--pos top|bottom|before:<id>|after:<id>` (default top). */
function parsePosition(f: Flags): Position {
  const v = str(f, 'pos');
  if (!v || v === 'top') return { at: 'top' };
  if (v === 'bottom') return { at: 'bottom' };
  const m = v.match(/^(before|after):(\d+)$/);
  if (m) return { at: m[1] as 'before' | 'after', anchorId: Number(m[2]) };
  throw new Error(`bad --pos "${v}" (use top|bottom|before:<id>|after:<id>)`);
}

function modelFilter(f: Flags): string[] | undefined {
  const v = str(f, 'model');
  return v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
}

function out(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

function main(argv: string[]): number {
  const args = argv.slice(2);
  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    process.stdout.write(USAGE);
    return args.length ? 0 : 1;
  }
  const cmd = args[0];
  const { positional, flags } = parseFlags(args.slice(1));
  const id = (): number => {
    const n = Number(positional[0]);
    if (!Number.isInteger(n)) throw new Error(`${cmd} needs a numeric <id>`);
    return n;
  };
  const now = Date.now();
  const db = openDb();

  switch (cmd) {
    case 'init':
      out({ db: taskqDbPath(), schemaVersion: SCHEMA_VERSION });
      return 0;

    case 'ls': {
      const status = str(flags, 'status') as NewTask['status'] | undefined;
      const rows = listTasks(db, status ? { status } : {});
      if (flags.json) out(rows);
      else
        for (const t of rows)
          process.stdout.write(`#${t.id}\t${t.status}\t${t.title}${t.slug ? ` (id:${t.slug})` : ''}\n`);
      return 0;
    }

    case 'show': {
      const t = getTask(db, id());
      if (!t) {
        process.stderr.write(`task ${id()} not found\n`);
        return 1;
      }
      out({ ...t, needs: getNeeds(db, t.id) });
      return 0;
    }

    case 'next': {
      const nid = nextEligibleId(db, { repo: str(flags, 'repo'), models: modelFilter(flags) });
      out(nid == null ? null : getTask(db, nid));
      return 0;
    }

    case 'claim-next': {
      const worker = str(flags, 'worker');
      if (!worker) throw new Error('claim-next needs --worker');
      const task = claimNext(db, {
        workerId: worker,
        worktree: str(flags, 'worktree') ?? null,
        ttlMs: num(flags, 'ttl'),
        nowMs: now,
        filters: { repo: str(flags, 'repo'), models: modelFilter(flags) },
      });
      out(task);
      return 0;
    }

    case 'claim': {
      const worker = str(flags, 'worker');
      if (!worker) throw new Error('claim needs --worker');
      const ok = claim(db, id(), {
        workerId: worker,
        worktree: str(flags, 'worktree') ?? null,
        ttlMs: num(flags, 'ttl'),
        nowMs: now,
      });
      out({ claimed: ok, task: ok ? getTask(db, id()) : null });
      return ok ? 0 : 1;
    }

    case 'complete':
      completeTask(
        db,
        id(),
        {
          commit: str(flags, 'commit'),
          summary: str(flags, 'summary'),
          durationS: num(flags, 'duration'),
          startedAt: num(flags, 'started'),
        },
        now,
      );
      out({ completed: id() });
      return 0;

    case 'fail': {
      const reason = str(flags, 'reason');
      if (!reason) throw new Error('fail needs --reason');
      failTask(db, id(), reason, now);
      out({ failed: id() });
      return 0;
    }

    case 'release':
      releaseLease(db, id());
      out({ released: id() });
      return 0;

    case 'heartbeat':
      out({ alive: heartbeat(db, id(), now, num(flags, 'ttl')) });
      return 0;

    case 'reap':
      out({ reaped: reapExpired(db, now) });
      return 0;

    case 'add': {
      const title = positional[0];
      if (!title) throw new Error('add needs a "<title>"');
      const draft = draftFromFlags({ ...flags, title });
      const newId = addTask(db, draft, parsePosition(flags));
      out({ id: newId });
      return 0;
    }

    case 'update': {
      const patch = draftFromFlags(flags);
      if (str(flags, 'title') === undefined) delete (patch as Partial<TaskPatch>).title;
      updateTask(db, id(), patch);
      if (str(flags, 'pos') !== undefined) moveTask(db, id(), parsePosition(flags));
      out({ updated: id() });
      return 0;
    }

    case 'hold':
      setStatus(db, id(), 'on_hold', str(flags, 'note') ?? null);
      out({ held: id() });
      return 0;

    case 'unhold':
      setStatus(db, id(), 'ready');
      out({ readied: id() });
      return 0;

    case 'status': {
      const state = positional[1] as NewTask['status'];
      if (!state) throw new Error('status needs <id> <state>');
      setStatus(db, id(), state, flags.note !== undefined ? (str(flags, 'note') ?? null) : undefined);
      out({ id: id(), status: state });
      return 0;
    }

    case 'rm':
      deleteTask(db, id());
      out({ removed: id() });
      return 0;

    case 'view': {
      const rows = listTasks(db);
      const needs: Record<number, string[]> = {};
      for (const t of rows) {
        const n = getNeeds(db, t.id);
        if (n.length) needs[t.id] = n;
      }
      const md = renderTasksMarkdown(rows, needs);
      if (flags.write !== undefined) {
        const path = typeof flags.write === 'string' ? flags.write : join(taskqHome(), 'TASKS.view.md');
        writeFileSync(path, md);
        out({ wrote: path });
      } else process.stdout.write(md);
      return 0;
    }

    default:
      process.stderr.write(`unknown command: ${cmd}\n\n${USAGE}`);
      return 1;
  }
}

try {
  process.exit(main(process.argv));
} catch (e) {
  process.stderr.write(`taskq: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
