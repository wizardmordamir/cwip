import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import { claim, completeTask } from './claim';
import {
  acceptFinding,
  defaultFixTask,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  type FindingRow,
  findingFingerprint,
  findingsSummary,
  getFinding,
  getFindingByFingerprint,
  isKnownFindingType,
  isResolvedFindingStatus,
  listFindings,
  listOpenFindings,
  markFindingFixed,
  recordFinding,
  reopenFinding,
  resolveFindingsForTask,
  setFindingStatus,
  startFinding,
  validateNewFinding,
  wontfixFinding,
} from './findings';
import { migrate } from './schema';
import { deleteTask, getTask } from './tasks';
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

const sample = () => ({
  type: 'drift',
  location: 'src/services/taskq/claim.ts',
  description: 'completeTask does not clear the lease',
  severity: 'high' as const,
  detector: 'fu-drift-audit-recurring',
});

describe('findingFingerprint', () => {
  test('is stable + deterministic across calls', () => {
    expect(findingFingerprint(sample())).toBe(findingFingerprint(sample()));
  });

  test('ignores case / whitespace / trailing punctuation (same issue, same id)', () => {
    const a = findingFingerprint({ type: 'Drift', location: 'A/B.ts', description: 'A leaky thing.' });
    const b = findingFingerprint({ type: 'drift', location: 'a/b.ts ', description: '  a   leaky thing' });
    expect(a).toBe(b);
  });

  test('distinct issues get distinct ids; field boundaries do not alias', () => {
    const base = { type: 'drift', location: 'a', description: 'x' };
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, description: 'y' }));
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, location: 'b' }));
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, type: 'cve' }));
    // `ab|c` must not collide with `a|bc`.
    expect(findingFingerprint({ type: 'ab', location: 'c', description: 'd' })).not.toBe(
      findingFingerprint({ type: 'a', location: 'bc', description: 'd' }),
    );
  });

  test('is a 32-char hex string', () => {
    expect(findingFingerprint(sample())).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('vocabulary helpers', () => {
  test('isKnownFindingType', () => {
    expect(isKnownFindingType('drift')).toBe(true);
    expect(isKnownFindingType('totally-new-type')).toBe(false);
  });
  test('isResolvedFindingStatus', () => {
    for (const s of ['fixed', 'accepted', 'wontfix']) expect(isResolvedFindingStatus(s)).toBe(true);
    for (const s of ['open', 'in_progress']) expect(isResolvedFindingStatus(s)).toBe(false);
  });
  test('exported constants cover the documented vocab', () => {
    expect(FINDING_STATUSES).toEqual(['open', 'in_progress', 'fixed', 'accepted', 'wontfix']);
    expect(FINDING_SEVERITIES).toEqual(['info', 'low', 'medium', 'high', 'critical']);
  });
});

describe('validateNewFinding', () => {
  test('requires type/location/description', () => {
    expect(validateNewFinding({ type: '', location: '', description: '' })).toEqual([
      'type is required',
      'location is required',
      'description is required',
    ]);
  });
  test('rejects an unknown severity', () => {
    const errs = validateNewFinding({ type: 'drift', location: 'a', description: 'b', severity: 'huge' as never });
    expect(errs.some((e) => e.includes('invalid severity'))).toBe(true);
  });
  test('accepts an unknown TYPE (open vocabulary)', () => {
    expect(validateNewFinding({ type: 'novel-thing', location: 'a', description: 'b' })).toEqual([]);
  });
  test('recordFinding throws on an invalid finding', () => {
    expect(() => recordFinding(db, { type: '', location: 'a', description: 'b' })).toThrow(/invalid finding/);
  });
});

describe('recordFinding — the idempotent UPSERT contract', () => {
  test('a new fingerprint creates an OPEN finding + a linked fix task', () => {
    const r = recordFinding(db, sample());
    expect(r.created).toBe(true);
    expect(r.finding.status).toBe('open');
    expect(r.finding.severity).toBe('high');
    expect(r.finding.detector).toBe('fu-drift-audit-recurring');
    expect(r.fixTaskId).not.toBeNull();

    const task = getTask(db, r.fixTaskId as number);
    expect(task).not.toBeNull();
    expect(task?.status).toBe('ready');
    expect(task?.slug).toBe(`fix-finding-${r.finding.id}`);
    // The finding row links back to its fix task.
    expect(getFinding(db, r.finding.id)?.fix_task).toBe(r.fixTaskId);
  });

  test('a duplicate fingerprint (ANY status) does NOTHING — no dup row, no 2nd task', () => {
    const first = recordFinding(db, sample());
    const second = recordFinding(db, sample());
    expect(second.created).toBe(false);
    expect(second.finding.id).toBe(first.finding.id);
    expect(second.fixTaskId).toBe(first.fixTaskId);
    expect(listFindings(db)).toHaveLength(1);
    // Only ONE fix task ever filed.
    expect(getFinding(db, first.finding.id)?.fix_task).toBe(first.fixTaskId);
  });

  test('does NOTHING even when the finding is already resolved (never re-flagged)', () => {
    const r = recordFinding(db, sample());
    acceptFinding(db, r.finding.id, 'this is actually the right shape');
    const again = recordFinding(db, sample());
    expect(again.created).toBe(false);
    expect(again.finding.status).toBe('accepted'); // unchanged — NOT re-opened
    expect(listFindings(db)).toHaveLength(1);
  });

  test('a re-introduction after a fix is re-caught (same fingerprint, re-opened by hand)', () => {
    const r = recordFinding(db, sample());
    markFindingFixed(db, r.finding.id);
    expect(getFinding(db, r.finding.id)?.status).toBe('fixed');
    // The detector runs again and sees the same issue — still idempotent (no dup),
    // and the owner can reopen the same row to re-track the regression.
    expect(recordFinding(db, sample()).created).toBe(false);
    reopenFinding(db, r.finding.id);
    expect(getFinding(db, r.finding.id)?.status).toBe('open');
  });

  test('fixTask: false suppresses the auto-created task', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    expect(r.created).toBe(true);
    expect(r.fixTaskId).toBeNull();
    expect(getFinding(db, r.finding.id)?.fix_task).toBeNull();
  });

  test('a custom fixTask builder controls the filed task', () => {
    const r = recordFinding(db, sample(), {
      fixTask: (f) => ({ title: `custom for ${f.id}`, repo: 'cwip', model: 'opus' }),
    });
    const task = getTask(db, r.fixTaskId as number);
    expect(task?.title).toBe(`custom for ${r.finding.id}`);
    expect(task?.repo).toBe('cwip');
    expect(task?.model).toBe('opus');
  });

  test('the detector repo flows onto the default fix task', () => {
    const r = recordFinding(db, { ...sample(), repo: 'ru' });
    expect(getTask(db, r.fixTaskId as number)?.repo).toBe('ru');
  });

  test('severity defaults to medium', () => {
    const r = recordFinding(db, { type: 'perf', location: 'x', description: 'slow loop' });
    expect(r.finding.severity).toBe('medium');
  });
});

describe('completion auto-resolves the linked finding', () => {
  test('completing the fix task marks the finding fixed (+ resolved_at)', () => {
    const r = recordFinding(db, sample());
    const taskId = r.fixTaskId as number;
    claim(db, taskId, { workerId: 'w1', nowMs: T0 });
    completeTask(db, taskId, { commit: 'abc123', summary: 'fixed it' }, T0);

    const f = getFinding(db, r.finding.id) as FindingRow;
    expect(f.status).toBe('fixed');
    expect(f.resolved_at).not.toBeNull();
    expect(getTask(db, taskId)?.status).toBe('done');
  });

  test('completion does NOT override an accepted/wontfix finding', () => {
    const r = recordFinding(db, sample());
    const taskId = r.fixTaskId as number;
    // The worker judged the choice optimal and accepted the finding before completing.
    acceptFinding(db, r.finding.id, 'optimal as-is');
    claim(db, taskId, { workerId: 'w1', nowMs: T0 });
    completeTask(db, taskId, { summary: 'no change needed' }, T0);
    expect(getFinding(db, r.finding.id)?.status).toBe('accepted');
  });

  test('completing an unrelated task resolves nothing', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    expect(resolveFindingsForTask(db, 99999)).toBe(0);
    expect(getFinding(db, r.finding.id)?.status).toBe('open');
  });

  test('resolveFindingsForTask returns the count resolved', () => {
    const r = recordFinding(db, sample());
    expect(resolveFindingsForTask(db, r.fixTaskId as number)).toBe(1);
    expect(resolveFindingsForTask(db, r.fixTaskId as number)).toBe(0); // already fixed
  });
});

describe('status transitions + resolved_at', () => {
  test('resolved statuses stamp resolved_at; reopening clears it', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    expect(getFinding(db, r.finding.id)?.resolved_at).toBeNull();
    setFindingStatus(db, r.finding.id, 'wontfix', 'deferred to v2');
    const f = getFinding(db, r.finding.id) as FindingRow;
    expect(f.status).toBe('wontfix');
    expect(f.note).toBe('deferred to v2');
    expect(f.resolved_at).not.toBeNull();
    reopenFinding(db, r.finding.id);
    expect(getFinding(db, r.finding.id)?.resolved_at).toBeNull();
  });

  test('startFinding → in_progress (still open, no resolved_at)', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    startFinding(db, r.finding.id);
    const f = getFinding(db, r.finding.id) as FindingRow;
    expect(f.status).toBe('in_progress');
    expect(f.resolved_at).toBeNull();
  });

  test('wontfixFinding records the note', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    wontfixFinding(db, r.finding.id, 'intentional coupling');
    expect(getFinding(db, r.finding.id)?.note).toBe('intentional coupling');
  });

  test('setFindingStatus on an unknown id throws', () => {
    expect(() => setFindingStatus(db, 4242, 'fixed')).toThrow(/not found/);
  });
});

describe('reads + summary', () => {
  function seed() {
    recordFinding(db, { type: 'drift', location: 'a', description: 'one', severity: 'high' }, { fixTask: false });
    recordFinding(db, { type: 'cve', location: 'b', description: 'two', severity: 'critical' }, { fixTask: false });
    const third = recordFinding(
      db,
      { type: 'perf', location: 'c', description: 'three', severity: 'low' },
      { fixTask: false },
    );
    acceptFinding(db, third.finding.id);
  }

  test('listFindings filters by status / type / severity / openOnly', () => {
    seed();
    expect(listFindings(db)).toHaveLength(3);
    expect(listFindings(db, { status: 'accepted' })).toHaveLength(1);
    expect(listFindings(db, { type: 'cve' })).toHaveLength(1);
    expect(listFindings(db, { severity: 'high' })).toHaveLength(1);
    expect(listOpenFindings(db)).toHaveLength(2); // the accepted one is excluded
    expect(listFindings(db, { openOnly: true, type: 'drift' })).toHaveLength(1);
  });

  test('listFindings is newest-first', () => {
    seed();
    const ids = listFindings(db).map((f) => f.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  test('findingsSummary rolls up totals + breakdowns', () => {
    seed();
    const s = findingsSummary(db);
    expect(s.total).toBe(3);
    expect(s.open).toBe(2);
    expect(s.byStatus.open).toBe(2);
    expect(s.byStatus.accepted).toBe(1);
    expect(s.bySeverity.critical).toBe(1);
    expect(s.byType.drift).toBe(1);
  });

  test('getFindingByFingerprint round-trips', () => {
    const r = recordFinding(db, sample(), { fixTask: false });
    expect(getFindingByFingerprint(db, r.finding.fingerprint)?.id).toBe(r.finding.id);
    expect(getFindingByFingerprint(db, 'nope')).toBeNull();
  });
});

describe('fix-task link integrity', () => {
  test('deleting the fix task de-links the finding (ON DELETE SET NULL), keeps the finding', () => {
    const r = recordFinding(db, sample());
    deleteTask(db, r.fixTaskId as number);
    const f = getFinding(db, r.finding.id);
    expect(f).not.toBeNull();
    expect(f?.fix_task).toBeNull();
  });
});

describe('defaultFixTask', () => {
  test('produces a slugged, ready task referencing the finding + the accept/wontfix escape hatch', () => {
    const finding: FindingRow = {
      id: 7,
      fingerprint: 'f',
      type: 'leaky-interface',
      location: 'src/x.ts',
      description: 'exposes internal state',
      severity: 'medium',
      status: 'open',
      detector: null,
      fix_task: null,
      note: null,
      created_at: 'now',
      updated_at: 'now',
      resolved_at: null,
    };
    const draft = defaultFixTask(finding);
    expect(draft.slug).toBe('fix-finding-7');
    expect(draft.status).toBe('ready');
    expect(draft.title).toContain('leaky-interface');
    expect(draft.body).toContain('taskq findings accept 7');
    expect(draft.body).toContain('taskq findings wontfix 7');
  });
});
