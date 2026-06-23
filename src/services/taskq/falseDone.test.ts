import { describe, expect, test } from 'bun:test';
import { type DoneEvidence, decideDone } from './falseDone';

/** A landed, build-checked, green code-change task (the happy path) unless overridden. */
function evidence(over: Partial<DoneEvidence> = {}): DoneEvidence {
  return {
    enforced: true,
    noopOk: false,
    landedCommits: 1,
    buildChecked: true,
    buildGreen: true,
    toleratedRed: false,
    ...over,
  };
}

describe('decideDone: false-done gate', () => {
  test('non-flow repo (not enforced) is always accepted', () => {
    // landed nothing AND red build — but no objective branch to judge against.
    expect(decideDone(evidence({ enforced: false, landedCommits: 0, buildGreen: false }))).toEqual({ accept: true });
  });

  test('a landed code-change task with a green build is accepted', () => {
    expect(decideDone(evidence())).toEqual({ accept: true });
  });

  describe('the no-op exception (noop_ok)', () => {
    test('a noop_ok task completing with 0 commits is DONE, not reverted', () => {
      // The #267 audit-orchestration-hygiene case: ran, found nothing to fix, landed 0 commits.
      const v = decideDone(evidence({ noopOk: true, landedCommits: 0, buildChecked: false, buildGreen: undefined }));
      expect(v.accept).toBe(true);
    });

    test('a noop_ok task is STILL caught when it regresses the build (no-regression always enforced)', () => {
      const v = decideDone(evidence({ noopOk: true, landedCommits: 0, buildChecked: true, buildGreen: false }));
      expect(v.accept).toBe(false);
      if (!v.accept) expect(v.reason).toBe('regression');
    });
  });

  describe('empty-done (code-change task lands nothing) is caught', () => {
    test('a code-change task claiming done with 0 commits is CAUGHT', () => {
      const v = decideDone(evidence({ landedCommits: 0, buildChecked: false, buildGreen: undefined }));
      expect(v.accept).toBe(false);
      if (!v.accept) {
        expect(v.reason).toBe('empty-done');
        expect(v.status).toBe('on_hold');
      }
    });

    test('the verdict carries a disposition and NEVER a bare needs_input (no question to answer)', () => {
      const v = decideDone(evidence({ landedCommits: 0, buildChecked: false }));
      expect(v.accept).toBe(false);
      if (!v.accept) {
        // The disposition names WHY it's parked — not the question-bearing needs_input status.
        expect(v.disposition).toBe('needs_owner');
        expect(v.status).not.toBe('needs_input');
        expect(['needs_owner', 'awaiting_retry', 'awaiting_task']).toContain(v.disposition);
        expect(v.note).toMatch(/false-done/i);
      }
    });
  });

  describe('regression (landed but broke a known-green build) is caught', () => {
    test('known-green → now red is a regression → on_hold + disposition', () => {
      const v = decideDone(evidence({ landedCommits: 2, buildChecked: true, buildGreen: false, toleratedRed: false }));
      expect(v.accept).toBe(false);
      if (!v.accept) {
        expect(v.reason).toBe('regression');
        expect(v.status).toBe('on_hold');
        expect(v.disposition).toBe('needs_owner');
      }
    });

    test('an already-red / unknown integration (toleratedRed) is NOT this task’s regression → accept', () => {
      const v = decideDone(evidence({ landedCommits: 2, buildChecked: true, buildGreen: false, toleratedRed: true }));
      expect(v.accept).toBe(true);
    });

    test('a landed task whose build was not checked is accepted (no positive regression evidence)', () => {
      const v = decideDone(evidence({ landedCommits: 3, buildChecked: false, buildGreen: undefined }));
      expect(v.accept).toBe(true);
    });
  });
});
