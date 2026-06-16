import { describe, expect, it } from 'bun:test';
import { parseJUnitXml } from './parseJUnit';

// Representative of Bun's test-runner output: nested suites, self-closing passes,
// a <failure> child with message + stack, and entity-encoded names.
const BUN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" failures="1" skipped="1" time="0.13">
  <testsuite name="suite.spec.ts" file="suite.spec.ts">
    <testsuite name="lists" file="suite.spec.ts">
      <testcase name="creates a list" classname="lists" time="0.012" file="suite.spec.ts" line="5" />
      <testcase name="rejects &apos;bad&apos; input" classname="lists" time="0.008" file="suite.spec.ts" line="9">
        <failure message="expected 403, got 200">at suite.spec.ts:11:3</failure>
      </testcase>
      <testcase name="todo later" classname="lists" time="0">
        <skipped />
      </testcase>
    </testsuite>
  </testsuite>
</testsuites>`;

describe('parseJUnitXml', () => {
  it('maps passes, failures (msg+stack) and skips with totals', () => {
    const { cases, totals } = parseJUnitXml(BUN_XML);
    expect(totals).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1, todo: 0 });

    const pass = cases.find((c) => c.name === 'creates a list')!;
    expect(pass.status).toBe('passed');
    expect(pass.suite).toBe('lists');
    expect(pass.durationMs).toBe(12);
    expect(pass.file).toBe('suite.spec.ts');

    const fail = cases.find((c) => c.name === "rejects 'bad' input")!; // entity-decoded
    expect(fail.status).toBe('failed');
    expect(fail.error?.message).toBe('expected 403, got 200');
    expect(fail.error?.stack).toContain('suite.spec.ts:11:3');

    expect(cases.find((c) => c.name === 'todo later')!.status).toBe('skipped');
  });

  it('returns empty results for XML with no testcases', () => {
    expect(parseJUnitXml('<testsuites/>')).toEqual({
      cases: [],
      totals: { total: 0, passed: 0, failed: 0, skipped: 0, todo: 0 },
    });
  });
});
