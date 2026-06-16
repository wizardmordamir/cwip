import { describe, expect, it } from 'bun:test';
import {
  CATEGORY_COLORS,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  colorForCategory,
  groupOf,
  isCategoryKey,
  labelForCategory,
} from './taxonomy';

// orchlog's CATEGORY_GROUPS — kept here verbatim (as const, to match the
// readonly-tuple type of CATEGORY_GROUPS) so a drift between the recorder and cwip
// fails the suite (the whole point of cwip being the source of truth).
const ORCHLOG_GROUPS = {
  setup: ['deps-install', 'worktree-setup'],
  cognitive: ['planning', 'implementation', 'review-cleanup'],
  verify: ['typecheck', 'lint', 'build', 'unit-test', 'functional-test', 'e2e-test'],
  integration: ['conflict-resolution', 'landing'],
  meta: ['task-admin', 'documentation', 'other'],
} as const;

describe('taxonomy', () => {
  it('CATEGORY_GROUPS matches orchlog exactly', () => {
    expect(CATEGORY_GROUPS).toEqual(ORCHLOG_GROUPS);
  });

  it('CATEGORY_KEYS is the flat ordered concatenation of group keys', () => {
    expect(CATEGORY_KEYS).toEqual([
      'deps-install',
      'worktree-setup',
      'planning',
      'implementation',
      'review-cleanup',
      'typecheck',
      'lint',
      'build',
      'unit-test',
      'functional-test',
      'e2e-test',
      'conflict-resolution',
      'landing',
      'task-admin',
      'documentation',
      'other',
    ]);
  });

  it('labels, colors cover every category key', () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_LABELS[key]).toBeTruthy();
      expect(CATEGORY_COLORS[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('group labels cover every group key', () => {
    for (const g of Object.keys(CATEGORY_GROUPS)) {
      expect(CATEGORY_GROUP_LABELS[g as keyof typeof CATEGORY_GROUP_LABELS]).toBeTruthy();
    }
  });

  it('e2e-test label is "E2E tests"', () => {
    expect(CATEGORY_LABELS['e2e-test']).toBe('E2E tests');
  });

  it('groupOf maps known categories and falls back to meta', () => {
    expect(groupOf('typecheck')).toBe('verify');
    expect(groupOf('planning')).toBe('cognitive');
    expect(groupOf('landing')).toBe('integration');
    expect(groupOf('deps-install')).toBe('setup');
    expect(groupOf('nonsense')).toBe('meta');
  });

  it('isCategoryKey / labelForCategory / colorForCategory handle unknowns', () => {
    expect(isCategoryKey('build')).toBe(true);
    expect(isCategoryKey('nope')).toBe(false);
    expect(labelForCategory('build')).toBe('Build');
    expect(labelForCategory('nope')).toBe('nope');
    expect(colorForCategory('build')).toBe(CATEGORY_COLORS.build);
    expect(colorForCategory('nope')).toBe(CATEGORY_COLORS.other);
  });
});
