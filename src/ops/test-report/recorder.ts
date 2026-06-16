import { emptyTotals, type RunReportRecorder, type TestRunReport } from './types';

/**
 * Accumulate test-case results into a structured run report. Pure data — feed it
 * from any runner (a bun:test lifecycle, a Playwright reporter, a custom loop),
 * then `writeReportFiles` / `renderReport*` to persist or display it.
 */
export const createRunReport = (
  label: string,
  opts: { id?: string; startedAt?: string; meta?: Record<string, unknown> } = {},
): RunReportRecorder => {
  const startedAt = opts.startedAt ?? new Date().toISOString();
  const id = opts.id ?? `${label}-${startedAt.replace(/[:.]/g, '-')}`;
  const report: TestRunReport = { id, label, startedAt, totals: emptyTotals(), cases: [], meta: opts.meta };

  return {
    report,
    record(result) {
      report.cases.push(result);
      report.totals.total += 1;
      report.totals[result.status] += 1;
    },
    finish(at) {
      report.finishedAt = at ?? new Date().toISOString();
      report.durationMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();
      return report;
    },
  };
};
