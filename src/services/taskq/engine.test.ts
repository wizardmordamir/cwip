import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  claim,
  claimNext,
  completedCount,
  completeTask,
  DEFAULT_LEASE_TTL_MS,
  DEFAULT_MAX_ATTEMPTS,
  failHard,
  failTask,
  heartbeat,
  nextEligibleId,
  reapExpired,
  releaseLease,
  revertCompletion,
} from './claim';
import { depsSatisfied, unmetNeeds } from './deps';
import { isTimeRecurDue } from './recurrence';
import { migrate, SCHEMA_VERSION } from './schema';
import {
  addTask,
  dispositionFor,
  getTask,
  listNeedsOwner,
  listSerialGroups,
  listTasks,
  moveTask,
  parkTask,
  setSerialGroup,
  setStatus,
  updateTask,
} from './tasks';
import {
  AUTHORABLE_STATUSES,
  AUTO_MODEL,
  HOLD_DISPOSITIONS,
  isHoldDisposition,
  isParkedStatus,
  needsTiering,
  PARKED_STATUSES,
  type TaskqDb,
} from './types';

let db: TaskqDb;
const T0 = 1_000_000;

function fresh(): TaskqDb {
  const d = new Database(':memory:') as unknown as TaskqDb;
  d.exec('PRAGMA foreign_keys = ON');
  migrate(d);
  return d;
}

beforeEach(() => {
  db = fresh();
});

describe('schema', () => {
  test('migrate is idempotent and reports the version', () => {
    expect(migrate(db)).toBe(SCHEMA_VERSION);
    expect(migrate(db)).toBe(SCHEMA_VERSION);
  });
});

describe('tasks + positioning', () => {
  test('top/bottom/before/after order by ord', () => {
    const a = addTask(db, { title: 'a' }, { at: 'bottom' });
    const b = addTask(db, { title: 'b' }, { at: 'bottom' });
    addTask(db, { title: 'top' }, { at: 'top' });
    addTask(db, { title: 'between' }, { at: 'after', anchorId: a });
    addTask(db, { title: 'beforeB' }, { at: 'before', anchorId: b });
    expect(listTasks(db).map((t) => t.title)).toEqual(['top', 'a', 'between', 'beforeB', 'b']);
  });

  test('slug must be unique', () => {
    addTask(db, { title: 'a', slug: 'dup' });
    expect(() => addTask(db, { title: 'b', slug: 'dup' })).toThrow(/already used/);
  });

  test('update patches columns + replaces needs; move re-orders', () => {
    const id = addTask(db, { title: 'x', model: 'opus' }, { at: 'bottom' });
    const other = addTask(db, { title: 'y' }, { at: 'bottom' });
    updateTask(db, id, { title: 'x2', model: 'sonnet', needs: ['y-slug'] });
    expect(getTask(db, id)?.title).toBe('x2');
    expect(getTask(db, id)?.model).toBe('sonnet');
    moveTask(db, id, { at: 'before', anchorId: other });
    expect(listTasks(db)[0].id).toBe(id);
  });

  test('setStatus with a note (on_hold reason)', () => {
    const id = addTask(db, { title: 'x' });
    setStatus(db, id, 'on_hold', 'waiting on design');
    expect(getTask(db, id)?.status).toBe('on_hold');
    expect(getTask(db, id)?.note).toBe('waiting on design');
  });
});

describe('dependencies', () => {
  test('blocked while a needed non-done task exists; clears when done/absent', () => {
    const dep = addTask(db, { title: 'dep', slug: 'd' });
    const t = addTask(db, { title: 't', needs: ['d'] });
    expect(depsSatisfied(db, t)).toBe(false);
    setStatus(db, dep, 'done');
    expect(depsSatisfied(db, t)).toBe(true);

    const t2 = addTask(db, { title: 't2', needs: ['ghost'] }); // unknown slug = met
    expect(depsSatisfied(db, t2)).toBe(true);
  });

  test('nextEligible skips a dep-blocked task', () => {
    addTask(db, { title: 'dep', slug: 'd' }, { at: 'bottom' });
    addTask(db, { title: 'blocked', needs: ['d'] }, { at: 'top' }); // higher priority but blocked
    const id = nextEligibleId(db, T0);
    expect(getTask(db, id!)?.title).toBe('dep');
  });
});

describe('eligibility + claim', () => {
  test('one-shots before recurring; top ord first', () => {
    addTask(db, { title: 'recur', recur_n: 1 }, { at: 'top' });
    addTask(db, { title: 'first' }, { at: 'bottom' });
    addTask(db, { title: 'second' }, { at: 'bottom' });
    expect(getTask(db, nextEligibleId(db, T0)!)?.title).toBe('first');
  });

  test('claim is a CAS — only one winner', () => {
    const id = addTask(db, { title: 'x' });
    expect(claim(db, id, { workerId: 'w1', nowMs: T0 })).toBe(true);
    expect(claim(db, id, { workerId: 'w2', nowMs: T0 })).toBe(false);
    expect(getTask(db, id)?.status).toBe('claimed');
  });

  test('claimNext picks + claims topmost; tier + repo filters', () => {
    addTask(db, { title: 'ca-opus', repo: 'ca', model: 'opus' }, { at: 'bottom' });
    addTask(db, { title: 'ru-sonnet', repo: 'ru', model: 'sonnet' }, { at: 'bottom' });
    addTask(db, { title: 'untagged' }, { at: 'bottom' });

    const sonnetWorker = claimNext(db, { workerId: 'w', nowMs: T0, filters: { models: ['sonnet'] } });
    // opus task is filtered out → ru-sonnet is the topmost eligible for this tier.
    expect(sonnetWorker?.title).toBe('ru-sonnet');

    const ruOnly = claimNext(db, { workerId: 'w', nowMs: T0, filters: { repo: 'ca' } });
    expect(ruOnly?.title).toBe('ca-opus');
  });

  test('group: claiming one member claims the whole group for that worker', () => {
    addTask(db, { title: 'g1', group_key: 'vault' }, { at: 'bottom' });
    addTask(db, { title: 'g2', group_key: 'vault' }, { at: 'bottom' });
    addTask(db, { title: 'other' }, { at: 'bottom' });
    const claimed = claimNext(db, { workerId: 'w', nowMs: T0 });
    expect(claimed?.group_key).toBe('vault');
    expect(
      listTasks(db, { status: 'claimed' })
        .map((t) => t.title)
        .sort(),
    ).toEqual(['g1', 'g2']);
    expect(listTasks(db, { status: 'ready' }).map((t) => t.title)).toEqual(['other']);
  });
});

describe('auto-tier on claim (classify-on-eligible)', () => {
  test('a new task defaults to the auto marker', () => {
    const id = addTask(db, { title: 'whatever' });
    expect(getTask(db, id)?.model).toBe(AUTO_MODEL);
    expect(needsTiering(getTask(db, id)?.model)).toBe(true);
  });

  test('claimNext assesses an auto task BEFORE claiming → it becomes explicit', () => {
    const id = addTask(db, { title: 'Write the README docs' }); // auto → classifies light
    const claimed = claimNext(db, { workerId: 'w', nowMs: T0 });
    expect(claimed?.id).toBe(id);
    // The assessed tier is written before the claim returns — explicit now.
    expect(claimed?.model).toBe('sonnet');
    expect(claimed?.think).toBe('medium');
    expect(getTask(db, id)?.model).toBe('sonnet');
  });

  test('an explicit task is claimed verbatim — never re-assessed', () => {
    const id = addTask(db, { title: 'Update the README docs', model: 'opus', think: 'low' });
    const claimed = claimNext(db, { workerId: 'w', nowMs: T0 });
    expect(claimed?.id).toBe(id);
    expect(claimed?.model).toBe('opus'); // owner's pin respected
    expect(claimed?.think).toBe('low');
  });

  test('direct claim() also tiers the claimed task', () => {
    const id = addTask(db, { title: 'design the security schema' }); // auto → heavy
    expect(claim(db, id, { workerId: 'w', nowMs: T0 })).toBe(true);
    expect(getTask(db, id)?.model).toBe('opus');
    expect(getTask(db, id)?.think).toBe('max');
  });

  test('autoTier:false claims verbatim (leaves the marker)', () => {
    const id = addTask(db, { title: 'Write the README docs' });
    claimNext(db, { workerId: 'w', nowMs: T0, autoTier: false });
    expect(getTask(db, id)?.model).toBe(AUTO_MODEL);
  });

  test('tier routing: an auto task assessed heavy is left for the opus fleet, not claimed by a sonnet fleet', () => {
    const heavy = addTask(db, { title: 'design the auth security engine' }, { at: 'bottom' }); // → opus
    const light = addTask(db, { title: 'fix a small-fix typo' }, { at: 'bottom' }); // → sonnet

    // The sonnet fleet skips the (now-explicit) opus task and claims the sonnet one.
    const sonnetClaim = claimNext(db, { workerId: 'w1', nowMs: T0, filters: { models: ['sonnet'] } });
    expect(sonnetClaim?.id).toBe(light);
    expect(sonnetClaim?.model).toBe('sonnet');
    // The heavy task was assessed (→ opus) but left ready for the right fleet.
    const heavyRow = getTask(db, heavy)!;
    expect(heavyRow.status).toBe('ready');
    expect(heavyRow.model).toBe('opus');

    // The opus fleet then claims it.
    const opusClaim = claimNext(db, { workerId: 'w2', nowMs: T0, filters: { models: ['opus'] } });
    expect(opusClaim?.id).toBe(heavy);
  });

  test('an injected classifier overrides the heuristic on the claim path', () => {
    const id = addTask(db, { title: 'Write the README docs' }); // heuristic would say sonnet
    const claimed = claimNext(db, {
      workerId: 'w',
      nowMs: T0,
      classify: () => ({ model: 'haiku', think: 'low', confidence: 'heuristic', reason: 'pinned' }),
    });
    expect(claimed?.id).toBe(id);
    expect(claimed?.model).toBe('haiku');
  });
});

describe('draft: owner pre-queue, never auto-claimed', () => {
  test('a draft is never eligible and cannot be claimed; owner queues it via draft → ready', () => {
    const id = addTask(db, { title: 'owner idea', status: 'draft' });
    // Sits in the owner's pre-queue space — the scheduler never picks it.
    expect(nextEligibleId(db, T0)).toBeNull();
    expect(claimNext(db, { workerId: 'w', nowMs: T0 })).toBeNull();
    // A direct CAS claim is rejected too (claim only matches status='ready').
    expect(claim(db, id, { workerId: 'w', nowMs: T0 })).toBe(false);
    expect(getTask(db, id)?.status).toBe('draft');

    // The owner promotes the draft → ready to queue it; now it's claimable.
    setStatus(db, id, 'ready');
    expect(nextEligibleId(db, T0)).toBe(id);
    expect(claimNext(db, { workerId: 'w', nowMs: T0 })?.id).toBe(id);
  });

  test('a draft is owner-owned, not a worker park — carries no hold disposition', () => {
    const id = addTask(db, { title: 'unqueued', status: 'draft' });
    const t = getTask(db, id)!;
    expect(t.hold_disposition).toBeNull();
    expect(t.resolver_ref).toBeNull();
    expect(isParkedStatus('draft')).toBe(false);
    // The owner may set it directly from the board/UI.
    expect(AUTHORABLE_STATUSES).toContain('draft');
  });
});

describe('lifecycle: complete / fail / release / reap', () => {
  test('one-shot complete → done + a completion row', () => {
    const id = addTask(db, { title: 'x' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    completeTask(db, id, { commit: 'abc1234', summary: 'done', startedAt: T0, durationS: 42 }, T0 + 1000);
    expect(getTask(db, id)?.status).toBe('done');
    expect(completedCount(db)).toBe(1);
  });

  test('saved (no interval) complete → on_hold, not done', () => {
    const rid = addTask(db, { title: 'saved-task', is_saved: true });
    claim(db, rid, { workerId: 'w', nowMs: T0 });
    completeTask(db, rid, {}, T0 + 1);
    expect(getTask(db, rid)?.status).toBe('on_hold');
  });

  test('saved + interval complete → back to ready with recur_next_at', () => {
    const INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
    const rid = addTask(db, { title: 'saved-interval', is_saved: true, recur_interval_ms: INTERVAL });
    claim(db, rid, { workerId: 'w', nowMs: T0 });
    completeTask(db, rid, {}, T0 + 1);
    const after = getTask(db, rid)!;
    expect(after.status).toBe('ready');
    expect(after.recur_next_at).toBe(T0 + 1 + INTERVAL);
    // Not eligible yet (next_at is in the future)
    expect(isTimeRecurDue(after, T0 + 1)).toBe(false);
    // Eligible once the interval has passed
    expect(isTimeRecurDue(after, T0 + 1 + INTERVAL)).toBe(true);
  });

  test('fail auto-retries (back to ready + reason) by default; release returns to ready', () => {
    const id = addTask(db, { title: 'x', note: 'owner note: do the thing carefully' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    // A single transient failure is RE-QUEUED, not terminal — attempts < default max.
    const outcome = failTask(db, id, 'needs live creds', T0);
    expect(outcome.terminal).toBe(false);
    expect(outcome.status).toBe('ready');
    expect(getTask(db, id)?.status).toBe('ready');
    // The failure reason lands in last_error — and the owner's note is PRESERVED,
    // not clobbered by the engine-written reason (the data-loss bug this fixes).
    expect(getTask(db, id)?.last_error).toBe('needs live creds');
    expect(getTask(db, id)?.note).toBe('owner note: do the thing carefully');
    expect(getTask(db, id)?.attempts).toBe(1);

    const id2 = addTask(db, { title: 'y' });
    claim(db, id2, { workerId: 'w', nowMs: T0 });
    releaseLease(db, id2);
    expect(getTask(db, id2)?.status).toBe('ready');
  });

  test('reapExpired reclaims stranded leases (counts an attempt); heartbeat protects a live one', () => {
    const stranded = addTask(db, { title: 'stranded' });
    const alive = addTask(db, { title: 'alive' });
    claim(db, stranded, { workerId: 'w', nowMs: T0, ttlMs: 1000 });
    claim(db, alive, { workerId: 'w', nowMs: T0, ttlMs: 1000 });
    const later = T0 + 2000;
    heartbeat(db, alive, later); // extends well past `later`
    const reaped = reapExpired(db, later);
    expect(reaped).toBe(1);
    // A reaped task is re-queued like any transient failure: ready + attempts incremented.
    expect(getTask(db, stranded)?.status).toBe('ready');
    expect(getTask(db, stranded)?.attempts).toBe(1);
    // The reap reason is recorded on last_error (the lease-reap shares applyFailure).
    expect(getTask(db, stranded)?.last_error).toMatch(/lease expired/);
    expect(getTask(db, alive)?.status).toBe('claimed');
    expect(getTask(db, alive)?.attempts).toBe(0);
  });

  test('reapExpired drops an orphaned lease instead of crash-looping (FK-off / deleted-task case)', () => {
    // Prod runs foreign_keys OFF, so deleting a task does NOT cascade its lease away —
    // the orphan that the old reapExpired threw "task not found" on, rolling back the
    // whole reap forever (a 40-min stall). Reproduce: detach FK, delete under the lease.
    const ghost = addTask(db, { title: 'ghost' });
    claim(db, ghost, { workerId: 'w', nowMs: T0, ttlMs: 1000 });
    db.exec('PRAGMA foreign_keys = OFF');
    db.run('DELETE FROM tasks WHERE id = ?', ghost);
    db.exec('PRAGMA foreign_keys = ON');
    expect((db.query('SELECT COUNT(*) AS c FROM leases WHERE task_id = ?').get(ghost) as { c: number }).c).toBe(1);
    // Must not throw, and must clean the orphan so the next drain tick is healthy.
    expect(() => reapExpired(db, T0 + 2000)).not.toThrow();
    expect((db.query('SELECT COUNT(*) AS c FROM leases WHERE task_id = ?').get(ghost) as { c: number }).c).toBe(0);
  });

  test('reapExpired reclaims a dead-mid-run worker before the TTL (heartbeat advanced, then silent)', () => {
    const id = addTask(db, { title: 'mid-run death' });
    claim(db, id, { workerId: 'w', nowMs: T0, ttlMs: 60 * 60_000 }); // long TTL: not the backstop
    heartbeat(db, id, T0 + 90_000, 60 * 60_000); // actively worked (beat past claim), then drain died
    expect(reapExpired(db, T0 + 90_000 + 6 * 60_000)).toBe(1); // 6 min silent > DEAD_WORKER_MS (5)
    expect(getTask(db, id)?.status).toBe('ready');
    expect(getTask(db, id)?.attempts).toBe(1);
  });

  test('reapExpired reclaims a never-started ghost after the startup grace; protects it before', () => {
    const id = addTask(db, { title: 'never started' });
    claim(db, id, { workerId: 'w', nowMs: T0, ttlMs: 60 * 60_000 }); // heartbeat == claimed_at
    expect(reapExpired(db, T0 + 4 * 60_000)).toBe(0); // under the 5-min startup grace
    expect(getTask(db, id)?.status).toBe('claimed');
    expect(reapExpired(db, T0 + 6 * 60_000)).toBe(1); // past it → never heartbeated = never ran
    expect(getTask(db, id)?.status).toBe('ready');
  });

  test('reapExpired does NOT early-reap a group-queued member (parked at heartbeat==claimed_at)', () => {
    const member = addTask(db, { title: 'member' });
    claim(db, member, { workerId: 'w', nowMs: T0, ttlMs: 60 * 60_000 }); // heartbeat == claimed_at
    db.run("UPDATE tasks SET group_key = 'G' WHERE id = ?", member); // parked group member
    expect(reapExpired(db, T0 + 10 * 60_000)).toBe(0); // guarded out of the never-started branch
    expect(getTask(db, member)?.status).toBe('claimed');
  });

  test('default lease TTL is exported and positive', () => {
    expect(DEFAULT_LEASE_TTL_MS).toBeGreaterThan(0);
  });
});

describe('bounded auto-retry with backoff (resilience)', () => {
  test('a transient failure re-queues with a future backoff that holds it out of the pool', () => {
    const id = addTask(db, { title: 'flaky' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    const out = failTask(db, id, 'transient blip', T0, { backoff: { baseMs: 60_000, jitter: 0 } });
    expect(out.status).toBe('ready');
    expect(out.terminal).toBe(false);
    expect(out.attempts).toBe(1);
    expect(out.retryAt).toBe(T0 + 60_000);
    expect(getTask(db, id)?.recur_next_at).toBe(T0 + 60_000);
    // Not eligible during the backoff window…
    expect(nextEligibleId(db, T0)).toBeNull();
    expect(nextEligibleId(db, T0 + 59_000)).toBeNull();
    // …but eligible the moment it elapses.
    expect(nextEligibleId(db, T0 + 60_000)).toBe(id);
  });

  test('exhausting attempts parks terminal failed; dependents stay blocked, independents stay eligible', () => {
    const root = addTask(db, { title: 'root', slug: 'root' }, { at: 'bottom' });
    const dependent = addTask(db, { title: 'dependent', needs: ['root'] }, { at: 'bottom' });
    const indep = addTask(db, { title: 'indep' }, { at: 'bottom' });
    // Zero backoff → each retry is immediately eligible, so we can burn the budget in one test.
    const opts = { maxAttempts: 3, backoff: { baseMs: 0 } };
    for (let i = 1; i <= 3; i++) {
      claim(db, root, { workerId: 'w', nowMs: T0 });
      const out = failTask(db, root, 'always fails', T0, opts);
      if (i < 3) {
        expect(out.terminal).toBe(false);
        expect(getTask(db, root)?.status).toBe('ready');
      } else {
        expect(out.terminal).toBe(true);
      }
    }
    expect(getTask(db, root)?.status).toBe('failed');
    expect(getTask(db, root)?.attempts).toBe(3);
    // Failure isolation: the dependent is blocked (root never reached done); the
    // independent task is the next eligible pick — the queue keeps flowing.
    expect(depsSatisfied(db, dependent)).toBe(false);
    expect(nextEligibleId(db, T0)).toBe(indep);
  });

  test('failHard / permanent:true park terminal on the first failure (no retries burned)', () => {
    const id = addTask(db, { title: 'impossible' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    const out = failHard(db, id, 'needs a human decision', T0);
    expect(out.terminal).toBe(true);
    expect(out.status).toBe('failed');
    expect(getTask(db, id)?.status).toBe('failed');
    expect(getTask(db, id)?.attempts).toBe(1);

    const id2 = addTask(db, { title: 'dead-end' });
    claim(db, id2, { workerId: 'w', nowMs: T0 });
    expect(failTask(db, id2, 'x', T0, { permanent: true }).terminal).toBe(true);
    expect(getTask(db, id2)?.status).toBe('failed');
  });

  test('per-task max_attempts overrides the config default', () => {
    const id = addTask(db, { title: 'once', max_attempts: 1 });
    expect(getTask(db, id)?.max_attempts).toBe(1);
    claim(db, id, { workerId: 'w', nowMs: T0 });
    // max_attempts=1 → the very first failure is already terminal.
    const out = failTask(db, id, 'boom', T0);
    expect(out.maxAttempts).toBe(1);
    expect(out.terminal).toBe(true);
    expect(getTask(db, id)?.status).toBe('failed');
  });

  test('a repeatedly-reaped (hanging) task increments attempts and eventually parks', () => {
    const id = addTask(db, { title: 'hangs' });
    const opts = { maxAttempts: 2, backoff: { baseMs: 0 } };
    // First hang: claimed, lease expires, reap re-queues it (attempt 1).
    claim(db, id, { workerId: 'w', nowMs: T0, ttlMs: 1 });
    reapExpired(db, T0 + 10, opts);
    expect(getTask(db, id)?.status).toBe('ready');
    expect(getTask(db, id)?.attempts).toBe(1);
    // Second hang: reap exhausts the ceiling → terminal failed (no infinite loop).
    claim(db, id, { workerId: 'w', nowMs: T0 + 10, ttlMs: 1 });
    reapExpired(db, T0 + 20, opts);
    expect(getTask(db, id)?.status).toBe('failed');
    expect(getTask(db, id)?.attempts).toBe(2);
  });

  test('a successful completion resets the attempt counter (fresh budget for recurring runs)', () => {
    const INTERVAL = 60 * 60_000;
    const id = addTask(db, { title: 'recurring', is_saved: true, recur_interval_ms: INTERVAL });
    // Fail once (attempt 1), then claim + complete successfully.
    claim(db, id, { workerId: 'w', nowMs: T0 });
    failTask(db, id, 'transient', T0, { backoff: { baseMs: 0 } });
    expect(getTask(db, id)?.attempts).toBe(1);
    claim(db, id, { workerId: 'w', nowMs: T0 + 1 });
    completeTask(db, id, {}, T0 + 2);
    expect(getTask(db, id)?.attempts).toBe(0);
  });

  test('DEFAULT_MAX_ATTEMPTS is exported and bounded', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBeGreaterThanOrEqual(2);
  });
});

describe('serial_group: one-at-a-time gating', () => {
  test('only the first task is eligible while no member is claimed', () => {
    const a = addTask(db, { title: 'a', serial_group: 'sg' }, { at: 'bottom' });
    const b = addTask(db, { title: 'b', serial_group: 'sg' }, { at: 'bottom' });
    const other = addTask(db, { title: 'other' }, { at: 'bottom' });
    const id = nextEligibleId(db, T0);
    expect(id).toBe(a); // highest priority in the serial group
    expect(nextEligibleId(db, T0)).toBe(a); // still same — no state changed
    void b;
    void other;
  });

  test('claiming a member blocks other members of the same group', () => {
    const a = addTask(db, { title: 'a', serial_group: 'sg' }, { at: 'bottom' });
    const _b = addTask(db, { title: 'b', serial_group: 'sg' }, { at: 'bottom' });
    const other = addTask(db, { title: 'other' }, { at: 'bottom' });
    claim(db, a, { workerId: 'w', nowMs: T0 });
    // b should be skipped because a is claimed in the same serial_group
    expect(nextEligibleId(db, T0)).toBe(other);
  });

  test('once the claimed member finishes the next member becomes eligible', () => {
    const a = addTask(db, { title: 'a', serial_group: 'sg' }, { at: 'bottom' });
    const b = addTask(db, { title: 'b', serial_group: 'sg' }, { at: 'bottom' });
    claim(db, a, { workerId: 'w', nowMs: T0 });
    completeTask(db, a, {}, T0 + 1000);
    expect(nextEligibleId(db, T0)).toBe(b);
  });

  test('tasks in different serial groups are independent', () => {
    const a = addTask(db, { title: 'a', serial_group: 'g1' }, { at: 'bottom' });
    const b = addTask(db, { title: 'b', serial_group: 'g2' }, { at: 'bottom' });
    claim(db, a, { workerId: 'w', nowMs: T0 });
    // b is in a different group — not gated
    expect(nextEligibleId(db, T0)).toBe(b);
  });

  test('setSerialGroup assigns group to multiple tasks; listSerialGroups enumerates them', () => {
    const a = addTask(db, { title: 'a' });
    const b = addTask(db, { title: 'b' });
    const c = addTask(db, { title: 'c', serial_group: 'existing' });
    setSerialGroup(db, [a, b], 'new-group');
    expect(getTask(db, a)?.serial_group).toBe('new-group');
    expect(getTask(db, b)?.serial_group).toBe('new-group');
    expect(listSerialGroups(db).sort()).toEqual(['existing', 'new-group']);
    setSerialGroup(db, [a], null); // clear from one
    expect(getTask(db, a)?.serial_group).toBeNull();
    void c;
  });
});

describe('updateTask: clearing recur_n with null', () => {
  test('recur_n: null clears count-based recurrence', () => {
    const id = addTask(db, { title: 'r', recur_n: 5 });
    expect(getTask(db, id)?.recur_n).toBe(5);
    updateTask(db, id, { recur_n: null });
    expect(getTask(db, id)?.recur_n).toBeNull();
  });

  test('migrating count-based to time-based: recur_n: null + recur_interval_ms', () => {
    const id = addTask(db, { title: 'r', recur_n: 5 });
    updateTask(db, id, { recur_n: null, recur_interval_ms: 3_600_000 });
    const t = getTask(db, id)!;
    expect(t.recur_n).toBeNull();
    expect(t.recur_interval_ms).toBe(3_600_000);
  });

  test('recur_n: null + is_template converts to template', () => {
    const id = addTask(db, { title: 'r', recur_n: 3 });
    updateTask(db, id, { recur_n: null, is_template: true, status: 'on_hold' });
    const t = getTask(db, id)!;
    expect(t.recur_n).toBeNull();
    expect(t.is_template).toBe(1);
  });
});

describe('noop_ok flag (false-done no-op exception)', () => {
  test('defaults to 0; addTask stores the flag; updateTask toggles it', () => {
    const plain = addTask(db, { title: 'code-change' });
    expect(getTask(db, plain)?.noop_ok).toBe(0);

    const audit = addTask(db, { title: 'audit', noop_ok: true });
    expect(getTask(db, audit)?.noop_ok).toBe(1);

    updateTask(db, plain, { noop_ok: true });
    expect(getTask(db, plain)?.noop_ok).toBe(1);
    updateTask(db, audit, { noop_ok: false });
    expect(getTask(db, audit)?.noop_ok).toBe(0);
  });
});

describe('revertCompletion: false-done gate', () => {
  test('parks the task in on_hold with the note, drops the lease, resets attempts', () => {
    const id = addTask(db, { title: 'x' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    // Simulate a prior failure so attempts > 0 — revert must clear them.
    failTask(db, id, 'transient', T0, { backoff: { baseMs: 0 } });
    claim(db, id, { workerId: 'w', nowMs: T0 + 1 });
    revertCompletion(db, id, 'on_hold', 'false-done: no code landed', T0 + 2);
    const t = getTask(db, id)!;
    expect(t.status).toBe('on_hold');
    expect(t.note).toBe('false-done: no code landed');
    expect(t.attempts).toBe(0);
    // Lease must be gone — a reap should find nothing.
    expect(reapExpired(db, T0 + 1_000_000)).toBe(0);
  });

  test('needs_input status is accepted', () => {
    const id = addTask(db, { title: 'y' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    revertCompletion(db, id, 'needs_input', 'needs human review', T0 + 1);
    expect(getTask(db, id)?.status).toBe('needs_input');
    expect(getTask(db, id)?.note).toBe('needs human review');
  });

  test('a downstream needs: dep stays blocked after a false-done revert', () => {
    const upstream = addTask(db, { title: 'up', slug: 'up' }, { at: 'bottom' });
    const downstream = addTask(db, { title: 'down', needs: ['up'] }, { at: 'bottom' });
    claim(db, upstream, { workerId: 'w', nowMs: T0 });
    // False-done: revert upstream instead of completing it.
    revertCompletion(db, upstream, 'on_hold', 'no code', T0 + 1);
    // Downstream must still be blocked — upstream never reached 'done'.
    expect(depsSatisfied(db, downstream)).toBe(false);
    expect(nextEligibleId(db, T0)).toBeNull();
  });
});

describe('hold disposition: who unblocks a parked task + when', () => {
  // ── pure helpers ──────────────────────────────────────────────────────────
  test('isParkedStatus / dispositionFor / isHoldDisposition', () => {
    for (const s of PARKED_STATUSES) expect(isParkedStatus(s)).toBe(true);
    for (const s of ['ready', 'claimed', 'done', 'pending_triage'] as const) expect(isParkedStatus(s)).toBe(false);
    // parked status → requested disposition, else the safe needs_owner default.
    expect(dispositionFor('on_hold')).toBe('needs_owner');
    expect(dispositionFor('failed', 'awaiting_task')).toBe('awaiting_task');
    // non-parked status → no disposition (cleared on un-park).
    expect(dispositionFor('ready', 'awaiting_task')).toBeNull();
    expect(dispositionFor('done')).toBeNull();
    for (const d of HOLD_DISPOSITIONS) expect(isHoldDisposition(d)).toBe(true);
    expect(isHoldDisposition('nonsense')).toBe(false);
  });

  // ── the CONTRACT: every park path stamps a disposition ──────────────────────
  test('setStatus to a parked status defaults to needs_owner; un-park clears it', () => {
    const id = addTask(db, { title: 'x' });
    expect(getTask(db, id)?.hold_disposition).toBeNull(); // ready → none

    setStatus(db, id, 'on_hold', 'manual hold'); // the manual `taskq hold` path
    let t = getTask(db, id)!;
    expect(t.status).toBe('on_hold');
    expect(t.hold_disposition).toBe('needs_owner'); // never a silent strand
    expect(t.note).toBe('manual hold');

    setStatus(db, id, 'ready'); // unhold
    t = getTask(db, id)!;
    expect(t.hold_disposition).toBeNull();
    expect(t.resolver_ref).toBeNull();
  });

  test('setStatus honors an explicit disposition for a parked status', () => {
    const id = addTask(db, { title: 'x' });
    setStatus(db, id, 'not_ready', 'waiting on epic', 'awaiting_task');
    expect(getTask(db, id)?.hold_disposition).toBe('awaiting_task');
  });

  test('parkTask carries a resolver_ref and (for awaiting_retry) a retry time', () => {
    const dep = addTask(db, { title: 'down' });
    parkTask(db, dep, 'blocked', 'awaiting_dependency', { note: 'blocked on up', resolverRef: 'up' });
    let t = getTask(db, dep)!;
    expect(t.status).toBe('blocked');
    expect(t.hold_disposition).toBe('awaiting_dependency');
    expect(t.resolver_ref).toBe('up');

    const retry = addTask(db, { title: 'retry-by-hand' });
    parkTask(db, retry, 'failed', 'awaiting_retry', { retryAt: T0 + 5000 });
    t = getTask(db, retry)!;
    expect(t.hold_disposition).toBe('awaiting_retry');
    expect(t.recur_next_at).toBe(T0 + 5000); // retry time reuses recur_next_at

    expect(() => parkTask(db, retry, 'ready' as never, 'needs_owner')).toThrow(/not a parked status/);
  });

  // ── engine park paths ───────────────────────────────────────────────────────
  test('retry backoff → awaiting_retry; a successful claim clears it', () => {
    const id = addTask(db, { title: 'flaky' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    failTask(db, id, 'transient blip', T0, { backoff: { baseMs: 60_000, jitter: 0 } });
    const t = getTask(db, id)!;
    expect(t.status).toBe('ready'); // re-queued, held out by recur_next_at
    expect(t.hold_disposition).toBe('awaiting_retry');
    expect(t.recur_next_at).toBe(T0 + 60_000); // the retry time
    // Claiming it (after the backoff) clears the disposition — it's running now.
    claim(db, id, { workerId: 'w', nowMs: T0 + 60_000 });
    expect(getTask(db, id)?.hold_disposition).toBeNull();
  });

  test('exhausted retries → failed + needs_owner (no auto-resolver remains)', () => {
    const id = addTask(db, { title: 'always', max_attempts: 1, note: 'owner note kept' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    const out = failTask(db, id, 'boom', T0);
    expect(out.terminal).toBe(true);
    const t = getTask(db, id)!;
    expect(t.status).toBe('failed');
    expect(t.hold_disposition).toBe('needs_owner');
    expect(t.resolver_ref).toBeNull();
    // Terminal-fail path also writes last_error, not note — owner note survives.
    expect(t.last_error).toBe('boom');
    expect(t.note).toBe('owner note kept');
  });

  test('failHard / permanent → failed + needs_owner', () => {
    const id = addTask(db, { title: 'impossible' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    failHard(db, id, 'needs a human', T0);
    expect(getTask(db, id)?.hold_disposition).toBe('needs_owner');
    expect(getTask(db, id)?.last_error).toBe('needs a human');
  });

  test('saved (no interval) completion parks on_hold + needs_owner; one-shot done clears', () => {
    const saved = addTask(db, { title: 'saved', is_saved: true });
    claim(db, saved, { workerId: 'w', nowMs: T0 });
    completeTask(db, saved, {}, T0 + 1);
    const s = getTask(db, saved)!;
    expect(s.status).toBe('on_hold');
    expect(s.hold_disposition).toBe('needs_owner');

    const one = addTask(db, { title: 'one' });
    claim(db, one, { workerId: 'w', nowMs: T0 });
    completeTask(db, one, {}, T0 + 1);
    expect(getTask(db, one)?.hold_disposition).toBeNull(); // done is not a park
  });

  // ── THE rfc-31j FIX: a false-done revert can NEVER be a bare hold ────────────
  test('revertCompletion defaults to needs_owner — a bare revert can never strand', () => {
    const id = addTask(db, { title: 'x' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    // The legacy call shape (no disposition) — must still get a disposition.
    revertCompletion(db, id, 'needs_input', 'empty-done: landed no commits', T0 + 1);
    const t = getTask(db, id)!;
    expect(t.status).toBe('needs_input');
    expect(t.hold_disposition).toBe('needs_owner');
  });

  test('revertCompletion can name a heal follow-up (awaiting_task + resolver_ref)', () => {
    const id = addTask(db, { title: 'regressed' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    revertCompletion(db, id, 'on_hold', 'regressed the build', T0 + 1, 'awaiting_task', 'heal-ru-integration');
    const t = getTask(db, id)!;
    expect(t.status).toBe('on_hold');
    expect(t.hold_disposition).toBe('awaiting_task');
    expect(t.resolver_ref).toBe('heal-ru-integration');
    // A resolver-bearing revert still resets attempts + drops the lease (rfc-31j guarantees).
    expect(t.attempts).toBe(0);
    expect(reapExpired(db, T0 + 1_000_000)).toBe(0);
  });

  // ── creation + listing ──────────────────────────────────────────────────────
  test('addTask in a parked status stamps a disposition; explicit one + resolver honored', () => {
    const def = addTask(db, { title: 'imported-hold', status: 'on_hold' });
    expect(getTask(db, def)?.hold_disposition).toBe('needs_owner');

    const child = addTask(db, {
      title: 'epic-child',
      status: 'not_ready',
      hold_disposition: 'awaiting_task',
      resolver_ref: 'epic-1',
    });
    const c = getTask(db, child)!;
    expect(c.hold_disposition).toBe('awaiting_task');
    expect(c.resolver_ref).toBe('epic-1');
  });

  test('updateTask clears the disposition when moving to a non-parked status', () => {
    const id = addTask(db, { title: 'x', status: 'on_hold' });
    expect(getTask(db, id)?.hold_disposition).toBe('needs_owner');
    updateTask(db, id, { status: 'ready' });
    expect(getTask(db, id)?.hold_disposition).toBeNull();
    // An explicit disposition patch is honored.
    updateTask(db, id, { status: 'failed', hold_disposition: 'awaiting_retry' });
    expect(getTask(db, id)?.hold_disposition).toBe('awaiting_retry');
  });

  test('listNeedsOwner is the actionable subset (needs_owner holds only)', () => {
    const a = addTask(db, { title: 'a', status: 'on_hold' }); // needs_owner
    addTask(db, { title: 'b', status: 'not_ready', hold_disposition: 'awaiting_task', resolver_ref: 'x' });
    addTask(db, { title: 'c' }); // ready — not parked
    const owners = listNeedsOwner(db).map((t) => t.id);
    expect(owners).toEqual([a]);
  });

  test('unmetNeeds names the blocking slugs (the awaiting_dependency resolver)', () => {
    const dep = addTask(db, { title: 'dep', slug: 'd1' }, { at: 'bottom' });
    addTask(db, { title: 'dep2', slug: 'd2' }, { at: 'bottom' });
    const t = addTask(db, { title: 't', needs: ['d1', 'd2'] }, { at: 'bottom' });
    expect(unmetNeeds(db, t)).toEqual(['d1', 'd2']);
    setStatus(db, dep, 'done');
    expect(unmetNeeds(db, t)).toEqual(['d2']); // d1 satisfied
  });
});

describe('migration v11: disposition columns + backfill', () => {
  test('classifies pre-existing parked rows (blocked → awaiting_dependency, others → needs_owner)', () => {
    // Build a v10-shaped DB (no disposition columns), seed parked rows, then migrate.
    const raw = new Database(':memory:') as unknown as TaskqDb;
    raw.exec('PRAGMA foreign_keys = ON');
    // Re-run the real migrations only through v10 by stamping meta then migrating —
    // simplest: migrate fully, then NULL out the disposition to simulate legacy rows.
    migrate(raw);
    const blocked = addTask(raw, { title: 'blocked-task', status: 'blocked' });
    const upstream = addTask(raw, { title: 'up', slug: 'up' });
    raw.run(`INSERT INTO task_deps (task_id, needs_slug) VALUES (?, ?)`, blocked, 'up');
    const onHold = addTask(raw, { title: 'held', status: 'on_hold' });
    // Simulate legacy rows that predate the column (disposition not yet set).
    raw.run(`UPDATE tasks SET hold_disposition = NULL, resolver_ref = NULL`);
    // Re-run the backfill UPDATEs (idempotent — they only touch NULL rows).
    raw.run(
      `UPDATE tasks SET hold_disposition = 'awaiting_dependency',
         resolver_ref = (SELECT group_concat(d.needs_slug, ',') FROM task_deps d
            JOIN tasks x ON x.slug = d.needs_slug AND x.status <> 'done' WHERE d.task_id = tasks.id)
       WHERE status = 'blocked' AND hold_disposition IS NULL`,
    );
    raw.run(
      `UPDATE tasks SET hold_disposition = 'needs_owner'
       WHERE status IN ('on_hold','needs_input','not_ready','failed') AND hold_disposition IS NULL`,
    );
    expect(getTask(raw, blocked)?.hold_disposition).toBe('awaiting_dependency');
    expect(getTask(raw, blocked)?.resolver_ref).toBe('up');
    expect(getTask(raw, onHold)?.hold_disposition).toBe('needs_owner');
    void upstream;
  });
});
