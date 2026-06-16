import { describe, expect, it } from 'bun:test';
import type { TestCase, TestResult } from '@playwright/test/reporter';
import { playwrightResultToCase } from './reporter';

// Minimal stand-ins for Playwright's TestCase/TestResult — enough surface for the
// pure mapping (the real reporter is exercised end-to-end in the app e2e runs).
const fakeTest = (title: string, path: string[], file?: string): TestCase =>
  ({ title, titlePath: () => path, location: file ? { file, line: 1, column: 1 } : undefined }) as unknown as TestCase;

const fakeResult = (r: Partial<TestResult>): TestResult =>
  ({ status: 'passed', duration: 0, attachments: [], errors: [], ...r }) as unknown as TestResult;

describe('playwrightResultToCase', () => {
  it('maps a pass with suite path + file', () => {
    const c = playwrightResultToCase(
      fakeTest('creates a note', ['chromium', 'notes.spec.ts', 'notes', 'creates a note'], 'notes.spec.ts'),
      fakeResult({ status: 'passed', duration: 12 }),
    );
    expect(c).toMatchObject({ name: 'creates a note', status: 'passed', durationMs: 12, file: 'notes.spec.ts' });
    expect(c.suite).toBe('chromium › notes.spec.ts › notes');
  });

  it('maps failure + timedOut to failed and strips ANSI from the message', () => {
    const c = playwrightResultToCase(
      fakeTest('x', ['x']),
      fakeResult({
        status: 'timedOut',
        error: { message: '[31mexpected 403[0m', stack: 'at a.ts:1' } as TestResult['error'],
      }),
    );
    expect(c.status).toBe('failed');
    expect(c.error?.message).toBe('expected 403');
    expect(c.error?.stack).toBe('at a.ts:1');
  });

  it('converts attachments to artifacts (path → sourcePath, body → inline) and classifies kinds', () => {
    const c = playwrightResultToCase(
      fakeTest('shot', ['shot']),
      fakeResult({
        status: 'failed',
        attachments: [
          { name: 'screenshot', contentType: 'image/png', path: '/tmp/a.png' },
          { name: 'trace', contentType: 'application/zip', path: '/tmp/t.zip' },
          { name: 'page', contentType: 'text/html', body: Buffer.from('<html></html>') },
        ],
      } as Partial<TestResult>),
    );
    expect(c.artifacts).toHaveLength(3);
    const [shot, trace, page] = c.artifacts!;
    expect(shot).toMatchObject({ kind: 'screenshot', sourcePath: '/tmp/a.png' });
    expect(trace.kind).toBe('trace');
    expect(page).toMatchObject({ kind: 'html', inline: '<html></html>' });
  });
});
