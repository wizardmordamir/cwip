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
  acceptFinding,
  addTask,
  claim,
  claimNext,
  completeTask,
  deleteTask,
  type FindingSeverity,
  type FindingStatus,
  failTask,
  findingsSummary,
  getFinding,
  getNeeds,
  getTask,
  type HoldDisposition,
  heartbeat,
  isFindingSeverity,
  isFindingStatus,
  isHoldDisposition,
  listFindings,
  listNeedsOwner,
  listTasks,
  markFindingFixed,
  migrate,
  moveTask,
  type NewTask,
  nextEligibleId,
  type Position,
  parkTask,
  reapExpired,
  recordFinding,
  releaseLease,
  renderTasksMarkdown,
  reopenFinding,
  SCHEMA_VERSION,
  setStatus,
  startFinding,
  type TaskPatch,
  type TaskqDb,
  type TaskRow,
  taskqDbPath,
  taskqHome,
  updateTask,
  wontfixFinding,
} from '../services/taskq';

const USAGE = `taskq — SQLite task queue

Queue:
  taskq ls [--status S] [--needs-owner] [--json]   list tasks (--needs-owner: only holds a HUMAN must act on)
  taskq show <id> [--json]                show one task (incl. hold disposition + resolver + retry_at)
  taskq next [--repo R] [--model A,B]     print the next eligible task (no claim)
  taskq view [--write [path]]             render the markdown mirror (default ~/.taskq/TASKS.view.md)

Author:
  taskq add "<title>" [opts]              create a task → prints its id
  taskq update <id> [opts]                patch a task
  taskq hold <id> [--note T] | unhold <id>            (hold → needs_owner disposition)
  taskq status <id> <state> [--note T] [--disposition D] [--resolver REF]
                                          set status (draft|ready|on_hold|not_ready|pending_triage|…);
                                          a parked state defaults to needs_owner unless --disposition
                                          is given (needs_owner|awaiting_task|awaiting_retry|awaiting_dependency)
  taskq rm <id>

Run (orchestrator/worker):
  taskq claim-next --worker W [--worktree S] [--repo R] [--model A,B] [--ttl MS]
  taskq claim <id> --worker W [--worktree S] [--ttl MS]
  taskq complete <id> [--commit SHA] [--summary T] [--duration S] [--started MS]
  taskq fail <id> --reason T [--permanent] [--max-attempts N]   (auto-retries with backoff unless --permanent)
  taskq release <id> | heartbeat <id> | reap
  taskq init                              create/migrate the DB

Findings (continuous-improvement ledger — idempotent: fixed/accepted never re-flagged):
  taskq findings record --type T --location L --description D [--severity S] [--detector NAME] [--repo R] [--no-task]
                                          UPSERT by stable fingerprint. A NEW issue → open finding + auto-filed
                                          fix task (prints {created,finding,fixTaskId}); an existing one → no-op.
  taskq findings ls [--status S] [--type T] [--severity S] [--open] [--json]   list (--open: open+in_progress only)
  taskq findings show <id> [--json]       show one finding
  taskq findings summary [--json]         totals + counts by status/severity/type
  taskq findings start <id>               mark in_progress
  taskq findings fix <id>                 mark fixed (the fix task's completion does this automatically)
  taskq findings accept <id> [--note T]   the flagged choice is OPTIMAL — never re-flag
  taskq findings wontfix <id> [--note T]  a conscious deferral — never re-flag
  taskq findings reopen <id>              back to open (a regression resurfaced)

Author opts: --body --slug --repo --model --think --group --recur N --max-attempts N --needs a,b --note --status
             --fast   --noop-ok   --pos top|bottom|before:<id>|after:<id>
  (--noop-ok marks an audit/check/review task that may legitimately land no code — the
   false-done gate then accepts a no-op completion; --noop-ok false clears it.)
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
  if (f['max-attempts'] !== undefined) d.max_attempts = num(f, 'max-attempts');
  if (f.note !== undefined) d.note = str(f, 'note');
  if (f.status !== undefined) d.status = str(f, 'status') as NewTask['status'];
  if (f.fast !== undefined) d.fast = true;
  // `--noop-ok` marks an audit/check/review task that may land no git delta;
  // `--noop-ok false` clears it (so an `update` can toggle it back off).
  if (f['noop-ok'] !== undefined) d.noop_ok = f['noop-ok'] !== 'false';
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

/**
 * Surface the awaiting_retry time as an explicit `retry_at` in the JSON. The
 * engine reuses `recur_next_at` as the retry clock (no separate column), so a
 * consumer reading disposition info shouldn't have to know that overload — expose
 * it as `retry_at` when (and only when) the task is actually awaiting a retry.
 */
function withRetryAt(t: TaskRow): TaskRow & { retry_at: number | null } {
  return { ...t, retry_at: t.hold_disposition === 'awaiting_retry' ? t.recur_next_at : null };
}

/**
 * The `taskq findings …` sub-command group — the agent/detector interface to the
 * continuous-improvement ledger. `record` is the idempotent UPSERT a recurring
 * detector calls every sweep; the rest drive a finding through its lifecycle.
 */
function findingsCmd(db: TaskqDb, positional: string[], flags: Flags): number {
  const sub = positional[0];
  const fid = (): number => {
    const n = Number(positional[1]);
    if (!Number.isInteger(n)) throw new Error(`findings ${sub} needs a numeric <id>`);
    return n;
  };
  const note = (): string | null | undefined => (flags.note !== undefined ? (str(flags, 'note') ?? null) : undefined);

  switch (sub) {
    case 'record': {
      const type = str(flags, 'type');
      const location = str(flags, 'location');
      const description = str(flags, 'description');
      if (!type || !location || !description) {
        throw new Error('findings record needs --type, --location and --description');
      }
      const severity = str(flags, 'severity');
      if (severity !== undefined && !isFindingSeverity(severity)) {
        throw new Error(`bad --severity "${severity}" (use info|low|medium|high|critical)`);
      }
      // `--no-task` records the finding WITHOUT auto-filing a fix task (e.g. a detector
      // that batches its own follow-ups). Default behaviour files the linked fix task.
      const result = recordFinding(
        db,
        {
          type,
          location,
          description,
          severity: severity as FindingSeverity | undefined,
          detector: str(flags, 'detector'),
          repo: str(flags, 'repo'),
        },
        flags['no-task'] === true ? { fixTask: false } : {},
      );
      out(result);
      return 0;
    }

    case 'ls': {
      const status = str(flags, 'status');
      if (status !== undefined && !isFindingStatus(status)) {
        throw new Error(`bad --status "${status}" (use open|in_progress|fixed|accepted|wontfix)`);
      }
      const rows = listFindings(db, {
        openOnly: flags.open === true,
        status: status as FindingStatus | undefined,
        type: str(flags, 'type'),
        severity: str(flags, 'severity') as FindingSeverity | undefined,
      });
      if (flags.json) out(rows);
      else
        for (const f of rows) {
          const link = f.fix_task ? `\t→task#${f.fix_task}` : '';
          process.stdout.write(`#${f.id}\t${f.status}\t${f.severity}\t${f.type}\t${f.location}${link}\n`);
        }
      return 0;
    }

    case 'show': {
      const f = getFinding(db, fid());
      if (!f) {
        process.stderr.write(`finding ${fid()} not found\n`);
        return 1;
      }
      out(f);
      return 0;
    }

    case 'summary':
      out(findingsSummary(db));
      return 0;

    case 'start':
      startFinding(db, fid());
      out({ finding: fid(), status: 'in_progress' });
      return 0;

    case 'fix':
      markFindingFixed(db, fid());
      out({ finding: fid(), status: 'fixed' });
      return 0;

    case 'accept':
      acceptFinding(db, fid(), note());
      out({ finding: fid(), status: 'accepted' });
      return 0;

    case 'wontfix':
      wontfixFinding(db, fid(), note());
      out({ finding: fid(), status: 'wontfix' });
      return 0;

    case 'reopen':
      reopenFinding(db, fid());
      out({ finding: fid(), status: 'open' });
      return 0;

    default:
      throw new Error(`unknown findings command: ${sub ?? '(none)'} (see \`taskq --help\`)`);
  }
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
      // --needs-owner: the actionable worklist — parked tasks a HUMAN must unblock
      // (no auto-resolver). Overrides --status (it's a disposition filter, not a status one).
      const rows = flags['needs-owner'] ? listNeedsOwner(db) : listTasks(db, status ? { status } : {});
      if (flags.json) out(rows.map(withRetryAt));
      else
        for (const t of rows) {
          // Surface the disposition inline so a hold's owner/timing is visible at a glance.
          const disp = t.hold_disposition ? `\t${t.hold_disposition}${t.resolver_ref ? `→${t.resolver_ref}` : ''}` : '';
          process.stdout.write(`#${t.id}\t${t.status}${disp}\t${t.title}${t.slug ? ` (id:${t.slug})` : ''}\n`);
        }
      return 0;
    }

    case 'show': {
      const t = getTask(db, id());
      if (!t) {
        process.stderr.write(`task ${id()} not found\n`);
        return 1;
      }
      out({ ...withRetryAt(t), needs: getNeeds(db, t.id) });
      return 0;
    }

    case 'next': {
      const nid = nextEligibleId(db, Date.now(), { repo: str(flags, 'repo'), models: modelFilter(flags) });
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
      // Bounded auto-retry by default; `--permanent` parks terminal immediately,
      // `--max-attempts N` overrides the ceiling for this failure.
      const outcome = failTask(db, id(), reason, now, {
        permanent: flags.permanent === true,
        maxAttempts: num(flags, 'max-attempts'),
      });
      out({ id: id(), ...outcome });
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
      const disp = str(flags, 'disposition');
      if (disp !== undefined && !isHoldDisposition(disp)) {
        throw new Error(
          `bad --disposition "${disp}" (use needs_owner|awaiting_task|awaiting_retry|awaiting_dependency)`,
        );
      }
      const note = flags.note !== undefined ? (str(flags, 'note') ?? null) : undefined;
      // A parked state gets its disposition (explicit --disposition, else the
      // needs_owner default); a --resolver names the resolving task/dep. A resolver
      // only sticks via parkTask (setStatus is the no-resolver path), so route
      // through parkTask when both a disposition and a resolver are supplied.
      const resolver = str(flags, 'resolver');
      if (resolver !== undefined && disp) {
        parkTask(db, id(), state, disp as HoldDisposition, { note, resolverRef: resolver });
      } else {
        setStatus(db, id(), state, note, disp as HoldDisposition | undefined);
      }
      out({ id: id(), status: state });
      return 0;
    }

    case 'rm':
      deleteTask(db, id());
      out({ removed: id() });
      return 0;

    case 'findings':
      return findingsCmd(db, positional, flags);

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

// Use process.exitCode instead of process.exit() so stdout is fully flushed
// before the process terminates. process.exit() truncates at ~64KB when output
// exceeds the OS pipe buffer, producing invalid JSON on large task lists.
try {
  process.exitCode = main(process.argv);
} catch (e) {
  process.stderr.write(`taskq: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
}
