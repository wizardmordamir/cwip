import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import { applyTier, autoTierTask, classifyTier, type TierVerdict, tierVerdictFor } from './autoTier';
import { autoTierEligible } from './claim';
import { migrate } from './schema';
import { addTask, getTask, setStatus, updateTask } from './tasks';
import { AUTO_MODEL, needsTiering, type TaskqDb } from './types';

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

describe('needsTiering — the assess-me predicate', () => {
  test('unset (null/empty) and the auto sentinel need tiering; an explicit alias does not', () => {
    expect(needsTiering(null)).toBe(true);
    expect(needsTiering(undefined)).toBe(true);
    expect(needsTiering('')).toBe(true);
    expect(needsTiering(AUTO_MODEL)).toBe(true);
    expect(needsTiering('opus')).toBe(false);
    expect(needsTiering('sonnet')).toBe(false);
  });
});

describe('classifyTier — pure heuristic', () => {
  test('a HEAVY signal → opus/max (heuristic)', () => {
    const v = classifyTier({ title: 'Design the auth security schema' });
    expect(v.model).toBe('opus');
    expect(v.think).toBe('max');
    expect(v.confidence).toBe('heuristic');
  });

  test('a LIGHT signal → sonnet/medium (heuristic)', () => {
    const v = classifyTier({ title: 'Fix a typo in the README docs' });
    expect(v.model).toBe('sonnet');
    expect(v.think).toBe('medium');
    expect(v.confidence).toBe('heuristic');
  });

  test('heavy wins over light when both are present (schema migration → opus)', () => {
    const v = classifyTier({ title: 'schema migration for the orders table' });
    expect(v.model).toBe('opus');
    expect(v.think).toBe('max');
  });

  test('no signal → conservative default opus/high, flagged ambiguous', () => {
    const v = classifyTier({ title: 'do the thing for the widget' });
    expect(v.model).toBe('opus');
    expect(v.think).toBe('high');
    expect(v.confidence).toBe('ambiguous');
  });

  test('body and repo are part of the haystack', () => {
    expect(classifyTier({ title: 'work', body: 'this is a small-fix only' }).model).toBe('sonnet');
    expect(classifyTier({ title: 'work', repo: 'my-2d-game' }).model).toBe('sonnet');
    expect(classifyTier({ title: 'work', body: 'touches the parser engine' }).model).toBe('opus');
  });
});

describe('tierVerdictFor — respect-explicit gate', () => {
  test('returns a verdict only for an unassessed task; explicit → null', () => {
    expect(tierVerdictFor({ title: 'docs', model: AUTO_MODEL })).not.toBeNull();
    expect(tierVerdictFor({ title: 'docs', model: null })).not.toBeNull();
    expect(tierVerdictFor({ title: 'docs', model: 'opus' })).toBeNull();
  });

  test('an injected classifier overrides the heuristic; null falls through', () => {
    const pin: TierVerdict = { model: 'haiku', think: 'low', confidence: 'heuristic', reason: 'pinned' };
    expect(tierVerdictFor({ title: 'docs', model: AUTO_MODEL }, { classify: () => pin })).toEqual(pin);
    // Falls back to the heuristic when the classifier declines.
    expect(tierVerdictFor({ title: 'security schema', model: AUTO_MODEL }, { classify: () => null })?.model).toBe(
      'opus',
    );
  });

  test('a precomputed verdict is applied directly', () => {
    const v: TierVerdict = { model: 'fable', think: 'off', confidence: 'heuristic', reason: 'x' };
    expect(tierVerdictFor({ title: 'anything', model: AUTO_MODEL }, { verdict: v })).toEqual(v);
  });
});

describe('autoTierTask — persist a tier, idempotently', () => {
  test('an auto task is assessed and becomes EXPLICIT; an explicit task is untouched', () => {
    const auto = addTask(db, { title: 'Update the changelog docs' }); // defaults to model=auto
    expect(getTask(db, auto)?.model).toBe(AUTO_MODEL);

    const verdict = autoTierTask(db, auto);
    expect(verdict?.model).toBe('sonnet');
    const after = getTask(db, auto)!;
    expect(after.model).toBe('sonnet'); // explicit now — the already-assessed marker
    expect(after.think).toBe('medium');
    expect(needsTiering(after.model)).toBe(false);

    // Owner-set explicit task: never assessed.
    const pinned = addTask(db, { title: 'Update the changelog docs', model: 'opus' });
    expect(autoTierTask(db, pinned)).toBeNull();
    expect(getTask(db, pinned)?.model).toBe('opus');
  });

  test('idempotent by construction: a second assessment is a no-op', () => {
    const id = addTask(db, { title: 'design a new auth engine' });
    expect(autoTierTask(db, id)?.model).toBe('opus');
    // The explicit value IS the marker — re-running finds nothing to do.
    expect(autoTierTask(db, id)).toBeNull();
  });

  test('owner can force a re-assessment by re-setting the model to auto', () => {
    const id = addTask(db, { title: 'tiny ui-tweak' });
    autoTierTask(db, id);
    expect(getTask(db, id)?.model).toBe('sonnet');
    // Re-set to auto → assessable again.
    updateTask(db, id, { model: AUTO_MODEL });
    expect(needsTiering(getTask(db, id)?.model)).toBe(true);
    expect(autoTierTask(db, id)?.model).toBe('sonnet');
  });

  test('a missing task → null (no throw)', () => {
    expect(autoTierTask(db, 999)).toBeNull();
  });

  test('applyTier writes only model + think', () => {
    const id = addTask(db, { title: 'x', status: 'on_hold', note: 'parked' });
    applyTier(db, id, { model: 'haiku', think: 'low', confidence: 'heuristic', reason: 'r' });
    const t = getTask(db, id)!;
    expect(t.model).toBe('haiku');
    expect(t.think).toBe('low');
    expect(t.status).toBe('on_hold'); // untouched
    expect(t.note).toBe('parked'); // untouched
  });
});

describe('autoTierEligible — drainer sweep', () => {
  test('tiers every eligible auto task; skips explicit, templates, and dep-blocked', () => {
    addTask(db, { title: 'doc sweep' }, { at: 'bottom' }); // auto → eligible
    addTask(db, { title: 'security audit of the api' }, { at: 'bottom' }); // auto → eligible
    addTask(db, { title: 'pinned', model: 'sonnet' }, { at: 'bottom' }); // explicit → skipped
    addTask(db, { title: 'tmpl', is_template: true }, { at: 'bottom' }); // template → skipped
    addTask(db, { title: 'dep', slug: 'd' }, { at: 'bottom' });
    addTask(db, { title: 'blocked', needs: ['d'] }, { at: 'bottom' }); // dep unmet → skipped

    const tiered = autoTierEligible(db, T0);
    // doc sweep, security audit, dep (its own deps are met) → 3 assessed.
    expect(tiered).toBe(3);
    expect(getTask(db, 1)?.model).toBe('sonnet'); // doc sweep
    expect(getTask(db, 2)?.model).toBe('opus'); // security/api
    expect(getTask(db, 3)?.model).toBe('sonnet'); // explicit, untouched
    expect(getTask(db, 4)?.model).toBe(AUTO_MODEL); // template, untouched
    expect(getTask(db, 6)?.model).toBe(AUTO_MODEL); // dep-blocked, untouched

    // Idempotent: a second sweep finds nothing new (the dep is still ready/untiered? no —
    // it was tiered above; only the still-auto dep-blocked one remains, still blocked).
    expect(autoTierEligible(db, T0)).toBe(0);
  });

  test('the blocked task is tiered once its dependency completes', () => {
    addTask(db, { title: 'dep', slug: 'd' }, { at: 'bottom' });
    const blocked = addTask(db, { title: 'render the security report', needs: ['d'] }, { at: 'bottom' });
    autoTierEligible(db, T0); // dep gets tiered; blocked is skipped
    expect(getTask(db, blocked)?.model).toBe(AUTO_MODEL);
    setStatus(db, 1, 'done'); // satisfy the dep
    expect(autoTierEligible(db, T0)).toBe(1);
    expect(getTask(db, blocked)?.model).toBe('opus'); // security → opus
  });
});
