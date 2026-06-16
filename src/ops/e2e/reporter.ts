import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createRunReport } from '../test-report/recorder';
import type {
  RunReportRecorder,
  TestArtifact,
  TestArtifactKind,
  TestCaseResult,
  TestStatus,
} from '../test-report/types';
import { writeReportFiles } from '../test-report/write';

export interface CwipReporterOptions {
  /** Directory to write `<id>.json/.html/.txt` + the `<id>-artifacts/` dir into. */
  dir: string;
  /** Report label (default `e2e`). */
  label?: string;
  /** Free-form run metadata merged into the report (git sha, mode, ci, …). */
  meta?: Record<string, unknown>;
}

// Playwright error messages embed ANSI color codes; strip them for clean storage.
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
const stripAnsi = (s: string): string => s.replace(/\[[0-9;]*m/g, '');

const mapStatus = (s: TestResult['status']): TestStatus =>
  s === 'passed' ? 'passed' : s === 'skipped' ? 'skipped' : 'failed';

const kindFor = (name: string, contentType: string): TestArtifactKind => {
  if (contentType.startsWith('image/')) return 'screenshot';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType === 'text/html') return 'html';
  if (contentType === 'application/zip' || name === 'trace') return 'trace';
  if (contentType === 'application/json') return /network/i.test(name) ? 'network' : 'json';
  return 'log';
};

/**
 * Pure mapping of one Playwright result into a cwip `TestCaseResult` — status,
 * suite path, error (ANSI-stripped), and attachments → artifacts (a `path`
 * becomes a `sourcePath` the writer copies in; an inline `body` is kept). Exported
 * so it can be unit-tested without a browser.
 */
export const playwrightResultToCase = (test: TestCase, result: TestResult): TestCaseResult => {
  const titlePath = test.titlePath().filter(Boolean);
  const suite = titlePath.slice(0, -1).join(' › ') || undefined;
  const errMsg = result.error?.message ?? result.errors?.[0]?.message;

  const artifacts: TestArtifact[] = (result.attachments ?? [])
    .filter((a) => a.path || a.body)
    .map((a) => {
      const art: TestArtifact = { kind: kindFor(a.name, a.contentType), name: a.name, mime: a.contentType };
      if (a.path) art.sourcePath = a.path;
      else if (a.body) art.inline = a.body.toString('utf8');
      return art;
    });

  return {
    name: test.title,
    ...(suite && { suite }),
    ...(test.location?.file && { file: test.location.file }),
    status: mapStatus(result.status),
    durationMs: result.duration,
    ...(errMsg && {
      error: { message: stripAnsi(errMsg), ...(result.error?.stack && { stack: stripAnsi(result.error.stack) }) },
    }),
    ...(artifacts.length && { artifacts }),
  };
};

/**
 * A Playwright reporter that converts results into a cwip `TestRunReport` and
 * writes it (JSON/HTML/TXT + materialized artifacts) to `dir` — so Playwright E2E
 * runs land in the same reports directory and admin viewer as functional/unit
 * runs, with screenshots/trace/video carried over from Playwright attachments.
 *
 *   // playwright.config.ts
 *   reporter: [['list'], ['cwip/e2e/reporter', { dir: TEST_REPORTS_DIR, label: 'e2e' }]]
 */
export class CwipPlaywrightReporter implements Reporter {
  private readonly opts: CwipReporterOptions;
  private readonly rec: RunReportRecorder;

  constructor(opts: CwipReporterOptions) {
    this.opts = opts;
    this.rec = createRunReport(opts.label ?? 'e2e', opts.meta ? { meta: opts.meta } : {});
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.rec.record(playwrightResultToCase(test, result));
  }

  onEnd(_result: FullResult): void {
    writeReportFiles(this.opts.dir, this.rec.finish());
  }
}

export default CwipPlaywrightReporter;
