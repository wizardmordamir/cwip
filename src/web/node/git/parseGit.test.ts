import { describe, expect, it } from 'bun:test';
import {
  ageDays,
  filterRefs,
  parseBranchNames,
  parseBranchTracking,
  parseCheckedOutBranches,
  parseGoneBranches,
  parseRemoteRefs,
  parseTags,
  type ScoredRef,
} from '.';

describe('parseBranchTracking', () => {
  it('parses ahead/behind/gone from the track field', () => {
    const text = ['main\torigin/main\t', 'feat\torigin/feat\tahead 2, behind 1', 'dead\torigin/dead\tgone'].join('\n');
    expect(parseBranchTracking(text)).toEqual([
      { name: 'main', upstream: 'origin/main', ahead: 0, behind: 0, gone: false },
      { name: 'feat', upstream: 'origin/feat', ahead: 2, behind: 1, gone: false },
      { name: 'dead', upstream: 'origin/dead', ahead: 0, behind: 0, gone: true },
    ]);
  });

  it('handles a branch with no upstream', () => {
    expect(parseBranchTracking('local\t\t')).toEqual([
      { name: 'local', upstream: '', ahead: 0, behind: 0, gone: false },
    ]);
  });

  it('parses ahead-only and behind-only tracking', () => {
    const text = ['feat/a\torigin/feat/a\tahead 2', 'feat/b\torigin/feat/b\tbehind 5'].join('\n');
    expect(parseBranchTracking(text)).toEqual([
      { name: 'feat/a', upstream: 'origin/feat/a', ahead: 2, behind: 0, gone: false },
      { name: 'feat/b', upstream: 'origin/feat/b', ahead: 0, behind: 5, gone: false },
    ]);
  });
});

describe('parseBranchNames', () => {
  it('strips current/worktree markers and blanks', () => {
    expect(parseBranchNames('* main\n  feat/x\n+ wt-branch\n')).toEqual(['main', 'feat/x', 'wt-branch']);
  });
});

describe('parseCheckedOutBranches', () => {
  it('extracts branch refs from worktree porcelain output', () => {
    const text = ['worktree /a', 'branch refs/heads/main', '', 'worktree /b', 'branch refs/heads/feat/x'].join('\n');
    expect(parseCheckedOutBranches(text)).toEqual(['main', 'feat/x']);
  });
});

describe('parseRemoteRefs', () => {
  const line = (symref: string, name: string, date: string, author = 'Ada', email = '<ada@x.io>') =>
    [symref, name, date, author, email].join('\t');

  it('drops the HEAD symref pointer and the default branch', () => {
    const text = [
      line('refs/remotes/origin/main', 'origin/HEAD', '2026-01-01T00:00:00Z'),
      line('', 'origin/main', '2026-01-02T00:00:00Z'),
      line('', 'origin/feat/x', '2026-01-03T00:00:00Z'),
    ].join('\n');
    expect(parseRemoteRefs(text, 'main')).toEqual([
      { name: 'feat/x', date: '2026-01-03T00:00:00Z', author: 'Ada', email: 'ada@x.io' },
    ]);
  });
});

describe('ageDays', () => {
  it('computes whole-day age against an injected now', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    expect(ageDays('2026-01-01T12:00:00Z', now)).toBe(9);
    expect(ageDays('2026-01-10T00:00:00Z', now)).toBe(0);
    expect(ageDays('2026-01-11T13:00:00Z', now)).toBe(-2);
  });
});

describe('filterRefs', () => {
  const ref = (over: Partial<ScoredRef>): ScoredRef => ({
    name: 'feat/x',
    date: '2026-01-01T00:00:00Z',
    author: 'Ada Lovelace',
    email: 'ada@x.io',
    ahead: 1,
    behind: 0,
    ...over,
  });
  const now = new Date('2026-02-01T00:00:00Z');

  it('matches author against name or email, case-insensitively', () => {
    const refs = [ref({}), ref({ name: 'other', author: 'Bo', email: 'bo@y.io' })];
    expect(filterRefs(refs, { author: 'ADA', now })).toEqual([refs[0]]);
    expect(filterRefs(refs, { author: 'bo@y', now })).toEqual([refs[1]]);
  });

  it('filters by name substring, merged-only, age, and before-date', () => {
    const refs = [ref({ name: 'feat/new', date: '2026-01-31T00:00:00Z' }), ref({ name: 'fix/old', ahead: 0 })];
    expect(filterRefs(refs, { name: 'FIX', now })).toEqual([refs[1]]); // case-insensitive
    expect(filterRefs(refs, { mergedOnly: true, now })).toEqual([refs[1]]);
    expect(filterRefs(refs, { staleDays: 7, now })).toEqual([refs[1]]);
    expect(filterRefs(refs, { before: new Date('2026-01-15T00:00:00Z'), now })).toEqual([refs[1]]);
  });

  it('composes multiple filters', () => {
    const refs = [
      ref({ name: 'feat/login', date: '2026-01-29T00:00:00Z' }),
      ref({ name: 'merged/x', date: '2025-12-01T00:00:00Z', ahead: 0 }),
      ref({ name: 'old/thing', date: '2025-12-01T00:00:00Z', author: 'Bo', email: 'bo@y.io' }),
    ];
    expect(filterRefs(refs, { author: 'ada', staleDays: 30, now }).map((r) => r.name)).toEqual(['merged/x']);
  });
});

describe('parseGoneBranches', () => {
  it('finds branches whose upstream is gone', () => {
    const text = ['  good   abc123 [origin/good] msg', '  dead   def456 [origin/dead: gone] msg'].join('\n');
    expect(parseGoneBranches(text)).toEqual(['dead']);
  });
});

describe('parseTags', () => {
  it('parses name/commit/date tab-separated lines, skipping blanks', () => {
    const text = ['v2.0.0\tabc1234\t2026-01-02T00:00:00Z', '', 'v1.0.0\tdef5678\t2026-01-01T00:00:00Z'].join('\n');
    expect(parseTags(text)).toEqual([
      { name: 'v2.0.0', commit: 'abc1234', date: '2026-01-02T00:00:00Z' },
      { name: 'v1.0.0', commit: 'def5678', date: '2026-01-01T00:00:00Z' },
    ]);
  });

  it('tolerates a missing date field', () => {
    expect(parseTags('rc-1\tabc1234\t')).toEqual([{ name: 'rc-1', commit: 'abc1234', date: '' }]);
  });
});
