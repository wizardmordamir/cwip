// The cwip test-run report model — pure types, no `node:*`/`bun:*`. This is the
// browser-safe `cwip/test-report/types` subpath the UI viewer imports, and the
// shared shape every runner (a bun:test lifecycle, the Playwright reporter, a
// functional runner) accumulates into. The fs reader/writer + renderers live in
// the Node-safe `cwip/test-report` barrel and re-export these.

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'todo';

/** What a captured debug artifact is — drives how the viewer renders it. */
export type TestArtifactKind = 'screenshot' | 'html' | 'log' | 'network' | 'trace' | 'video' | 'json' | 'text';

/**
 * One debug artifact attached to a test case — a screenshot, the page HTML, a
 * console/network log, a Playwright trace, etc. Authored either with `inline`
 * content (small text) or a `sourcePath` (an existing file to copy); after
 * `writeReportFiles` persists it, `path` holds the relative location under the
 * run's `<id>-artifacts/` dir and the UI fetches it via the app's artifact route.
 */
export interface TestArtifact {
  kind: TestArtifactKind;
  /** Short human label; also the basis for the on-disk filename. */
  name: string;
  /** Relative path under the reports dir (e.g. `run-1-artifacts/login.png`) once persisted. */
  path?: string;
  /** Inline content for small text artifacts (html/log/json) authored in-memory. */
  inline?: string;
  /** Absolute path to an existing file (e.g. a Playwright screenshot) to copy in on write. */
  sourcePath?: string;
  /** MIME type, e.g. `image/png`, `text/html`, `text/plain`. */
  mime?: string;
  /** Size in bytes once persisted. */
  bytes?: number;
}

export interface TestCaseResult {
  name: string;
  /** Suite/describe path, e.g. `sharing > access-control`. */
  suite?: string;
  /** Source file the case came from. */
  file?: string;
  status: TestStatus;
  durationMs?: number;
  error?: { message: string; stack?: string };
  /** Arbitrary captured context (request/response, ids, server logs). */
  context?: Record<string, unknown>;
  /** Debug artifacts (screenshots, html, console/network logs, trace, …). */
  artifacts?: TestArtifact[];
}

export interface TestRunTotals {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
}

export interface TestRunReport {
  /** Unique id for the run (used as a filename stem + admin key). */
  id: string;
  /** A label like `unit`, `functional`, `e2e`. */
  label: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  totals: TestRunTotals;
  cases: TestCaseResult[];
  /** Free-form run metadata: git sha, runtime, ci flag, mode, server logs, etc. */
  meta?: Record<string, unknown>;
}

/** A newest-first list entry — the summary shape the list endpoint returns. */
export interface TestRunSummary {
  id: string;
  label: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  totals: TestRunTotals;
  mode?: unknown;
}

export interface RunReportRecorder {
  readonly report: TestRunReport;
  /** Record one case result; totals update automatically. */
  record(result: TestCaseResult): void;
  /** Stamp finishedAt/durationMs and return the finished report. */
  finish(at?: string): TestRunReport;
}

export const emptyTotals = (): TestRunTotals => ({ total: 0, passed: 0, failed: 0, skipped: 0, todo: 0 });
