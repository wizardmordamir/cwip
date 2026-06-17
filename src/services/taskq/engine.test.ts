import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  claim,
  claimNext,
  completedCount,
  completeTask,
  DEFAULT_LEASE_TTL_MS,
  failTask,
  heartbeat,
  nextEligibleId,
  reapExpired,
  releaseLease,
} from './claim';
import { depsSatisfied } from './deps';
import { isRecurDue } from './recurrence';
import { migrate, SCHEMA_VERSION } from './schema';
import { addTask, getTask, listTasks, moveTask, setStatus, updateTask } from './tasks';
import type { TaskqDb } from './types';

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

describe('lifecycle: complete / fail / release / reap', () => {
  test('one-shot complete → done + a completion row', () => {
    const id = addTask(db, { title: 'x' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    completeTask(db, id, { commit: 'abc1234', summary: 'done', startedAt: T0, durationS: 42 }, T0 + 1000);
    expect(getTask(db, id)?.status).toBe('done');
    expect(completedCount(db)).toBe(1);
  });

  test('recurring complete → back to ready, bumped recur_last, off cooldown', () => {
    const rid = addTask(db, { title: 'recurring', recur_n: 2 });
    // due immediately (count 0, last 0)
    expect(isRecurDue(getTask(db, rid)!, completedCount(db))).toBe(true);
    claim(db, rid, { workerId: 'w', nowMs: T0 });
    completeTask(db, rid, {}, T0 + 1);
    const after = getTask(db, rid)!;
    expect(after.status).toBe('ready');
    expect(isRecurDue(after, completedCount(db))).toBe(false); // just ran, cooldown reset
    // two more completions elapse → due again
    const a = addTask(db, { title: 'a' });
    claim(db, a, { workerId: 'w', nowMs: T0 });
    completeTask(db, a, {}, T0 + 2);
    const b = addTask(db, { title: 'b' });
    claim(db, b, { workerId: 'w', nowMs: T0 });
    completeTask(db, b, {}, T0 + 3);
    expect(isRecurDue(getTask(db, rid)!, completedCount(db))).toBe(true);
  });

  test('fail sets failed + reason; release returns to ready', () => {
    const id = addTask(db, { title: 'x' });
    claim(db, id, { workerId: 'w', nowMs: T0 });
    failTask(db, id, 'needs live creds', T0);
    expect(getTask(db, id)?.status).toBe('failed');
    expect(getTask(db, id)?.note).toBe('needs live creds');

    const id2 = addTask(db, { title: 'y' });
    claim(db, id2, { workerId: 'w', nowMs: T0 });
    releaseLease(db, id2);
    expect(getTask(db, id2)?.status).toBe('ready');
  });

  test('reapExpired reclaims stranded leases; heartbeat protects a live one', () => {
    const stranded = addTask(db, { title: 'stranded' });
    const alive = addTask(db, { title: 'alive' });
    claim(db, stranded, { workerId: 'w', nowMs: T0, ttlMs: 1000 });
    claim(db, alive, { workerId: 'w', nowMs: T0, ttlMs: 1000 });
    const later = T0 + 2000;
    heartbeat(db, alive, later); // extends well past `later`
    const reaped = reapExpired(db, later);
    expect(reaped).toBe(1);
    expect(getTask(db, stranded)?.status).toBe('ready');
    expect(getTask(db, alive)?.status).toBe('claimed');
  });

  test('default lease TTL is exported and positive', () => {
    expect(DEFAULT_LEASE_TTL_MS).toBeGreaterThan(0);
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
