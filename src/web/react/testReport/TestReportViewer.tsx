import { useEffect, useState } from 'react';
import type {
  TestArtifact,
  TestCaseResult,
  TestRunReport,
  TestRunSummary,
  TestStatus,
} from '../../../ops/test-report/types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import type { BadgeTone } from '../components/badgeTones';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../Spinner';

export interface TestReportViewerProps {
  /** Newest-first run summaries (the list view). */
  fetchSummaries: () => Promise<TestRunSummary[]>;
  /** One run's full report (the detail view). */
  fetchReport: (id: string) => Promise<TestRunReport>;
  /**
   * Build a URL for an artifact (screenshot/html/trace) so it can be shown or
   * downloaded — typically `/…/:id/artifacts/:name`. Omit if artifacts are inline
   * only. Receives the artifact's relative `path` basename too for convenience.
   */
  artifactUrl?: (reportId: string, artifact: TestArtifact) => string;
  onError?: (message: string) => void;
  className?: string;
}

const STATUS_TONE: Record<TestStatus, BadgeTone> = {
  passed: 'emerald',
  failed: 'rose',
  skipped: 'amber',
  todo: 'slate',
};
const MARK: Record<TestStatus, string> = { passed: '✓', failed: '✗', skipped: '○', todo: '·' };

const fmtDate = (iso?: string): string => (iso ? new Date(iso).toLocaleString() : '—');
const fmtDur = (ms?: number): string => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

/**
 * A shared, app-agnostic viewer for cwip `TestRunReport`s — list of runs + a detail
 * view with failures, every test, captured **debug artifacts** (screenshots inline,
 * page HTML in a sandboxed iframe, console/network logs), and server logs. The app
 * injects its own transport (`fetchSummaries`/`fetchReport`/`artifactUrl`), so the
 * same viewer serves cursedalchemy's admin console and rubato's reports page.
 */
export const TestReportViewer = ({
  fetchSummaries,
  fetchReport,
  artifactUrl,
  onError,
  className,
}: TestReportViewerProps) => {
  const [summaries, setSummaries] = useState<TestRunSummary[] | null>(null);
  const [selected, setSelected] = useState<TestRunReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSummaries()
      .then((s) => active && setSummaries(s))
      .catch((e) => onError?.(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [fetchSummaries, onError]);

  const open = async (id: string): Promise<void> => {
    setLoadingDetail(true);
    try {
      setSelected(await fetchReport(id));
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  if (selected) {
    return (
      <div className={className}>
        <ReportDetail report={selected} artifactUrl={artifactUrl} onBack={() => setSelected(null)} />
      </div>
    );
  }
  if (summaries === null) {
    return (
      <div className={className}>
        <Spinner /> <span className="text-sm text-gray-500">Loading test runs…</span>
      </div>
    );
  }
  if (summaries.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title="No test reports yet"
          description="Run the functional or e2e suite — each run drops a report here."
        />
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        {summaries.map((r) => (
          <RunRow key={r.id} run={r} busy={loadingDetail} onOpen={() => open(r.id)} />
        ))}
      </div>
    </div>
  );
};

const Totals = ({ totals }: { totals: TestRunSummary['totals'] }) => (
  <div className="flex items-center gap-2">
    <Badge tone="emerald">{totals.passed} passed</Badge>
    {totals.failed > 0 && <Badge tone="rose">{totals.failed} failed</Badge>}
    {totals.skipped > 0 && <Badge tone="amber">{totals.skipped} skipped</Badge>}
  </div>
);

const RunRow = ({ run, busy, onOpen }: { run: TestRunSummary; busy: boolean; onOpen: () => void }) => (
  <Card padding="lg" className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-semibold">{run.label}</span>
      {typeof run.mode === 'string' && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {run.mode}
        </span>
      )}
      <span className="text-xs text-gray-500">{fmtDate(run.startedAt)}</span>
    </div>
    <div className="flex items-center gap-3">
      <Totals totals={run.totals} />
      {run.durationMs != null && <span className="text-xs text-gray-500">{fmtDur(run.durationMs)}</span>}
      <Button onClick={onOpen} disabled={busy} variant="accent">
        View
      </Button>
    </div>
  </Card>
);

const ReportDetail = ({
  report,
  artifactUrl,
  onBack,
}: {
  report: TestRunReport;
  artifactUrl?: (reportId: string, artifact: TestArtifact) => string;
  onBack: () => void;
}) => {
  // Precompute stable keys (with occurrence index) outside the JSX so the key prop
  // doesn't reference the array index directly — test names can repeat across cases.
  const keyed = (cases: TestCaseResult[]) => cases.map((c, i) => ({ key: `${c.suite ?? ''}-${c.name}-${i}`, c }));
  const failureItems = keyed(report.cases.filter((c) => c.status === 'failed'));
  const caseItems = keyed(report.cases);
  const serverLogs = (report.meta?.serverLogs as string[] | undefined) ?? [];
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← All runs
      </button>

      <Card padding="lg" className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-semibold">{report.label}</span>
        <span className="text-xs text-gray-500">{fmtDate(report.startedAt)}</span>
        <Totals totals={report.totals} />
        <span className="text-xs text-gray-500">{fmtDur(report.durationMs)}</span>
      </Card>

      {failureItems.length > 0 && (
        <Card padding="lg" className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            Failures ({failureItems.length})
          </h3>
          {failureItems.map(({ key, c }) => (
            <CaseBlock key={key} c={c} reportId={report.id} artifactUrl={artifactUrl} failure />
          ))}
        </Card>
      )}

      <Card padding="lg" className="flex flex-col gap-1">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          All tests ({caseItems.length})
        </h3>
        {caseItems.map(({ key, c }) => (
          <CaseBlock key={key} c={c} reportId={report.id} artifactUrl={artifactUrl} />
        ))}
      </Card>

      {serverLogs.length > 0 && (
        <Card padding="lg" className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Captured server logs ({serverLogs.length} lines)
          </h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-900 p-3 text-xs text-gray-100">
            {serverLogs.join('\n')}
          </pre>
        </Card>
      )}
    </div>
  );
};

const CaseBlock = ({
  c,
  reportId,
  artifactUrl,
  failure,
}: {
  c: TestCaseResult;
  reportId: string;
  artifactUrl?: (reportId: string, artifact: TestArtifact) => string;
  failure?: boolean;
}) => {
  const hasDetail = (failure && c.error) || c.artifacts?.length;
  const row = (
    <div className="flex items-center gap-2 text-sm">
      <Badge tone={STATUS_TONE[c.status]}>{MARK[c.status]}</Badge>
      <span className="text-gray-700 dark:text-gray-300">
        {c.suite ? <span className="text-gray-400">{c.suite} › </span> : null}
        {c.name}
      </span>
      {c.durationMs != null && <span className="text-xs text-gray-400">{fmtDur(c.durationMs)}</span>}
    </div>
  );
  if (!hasDetail) return row;
  return (
    <div className={failure ? 'rounded border-l-2 border-rose-400 bg-rose-50 p-3 dark:bg-rose-900/20' : 'py-1'}>
      {row}
      {failure && c.error && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-rose-800 dark:text-rose-200">
          {c.error.message}
          {c.error.stack ? `\n${c.error.stack}` : ''}
        </pre>
      )}
      {c.artifacts?.length ? (
        <div className="mt-2 flex flex-col gap-2">
          {c.artifacts
            .map((a, i) => ({ key: `${a.kind}-${a.name}-${i}`, a }))
            .map(({ key, a }) => (
              <ArtifactView key={key} reportId={reportId} artifact={a} artifactUrl={artifactUrl} />
            ))}
        </div>
      ) : null}
    </div>
  );
};

const ArtifactView = ({
  reportId,
  artifact,
  artifactUrl,
}: {
  reportId: string;
  artifact: TestArtifact;
  artifactUrl?: (reportId: string, artifact: TestArtifact) => string;
}) => {
  const url = artifact.path && artifactUrl ? artifactUrl(reportId, artifact) : undefined;
  const label = `${artifact.kind}: ${artifact.name}`;

  if (artifact.kind === 'screenshot' && url) {
    return (
      <figure className="m-0">
        <img
          src={url}
          alt={artifact.name}
          loading="lazy"
          className="max-w-md rounded border border-gray-200 dark:border-gray-700"
        />
        <figcaption className="text-xs text-gray-500">{artifact.name}</figcaption>
      </figure>
    );
  }
  if (artifact.kind === 'html') {
    if (artifact.inline) {
      return (
        <details>
          <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">{label}</summary>
          <iframe
            title={artifact.name}
            srcDoc={artifact.inline}
            sandbox=""
            className="mt-1 h-80 w-full rounded border border-gray-200 dark:border-gray-700"
          />
        </details>
      );
    }
    if (url)
      return (
        <a href={url} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          {label}
        </a>
      );
  }
  if (
    (artifact.kind === 'log' || artifact.kind === 'network' || artifact.kind === 'text' || artifact.kind === 'json') &&
    artifact.inline
  ) {
    return (
      <details>
        <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">{label}</summary>
        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-gray-900 p-2 text-xs text-gray-100">
          {artifact.inline}
        </pre>
      </details>
    );
  }
  if (url)
    return (
      <a href={url} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
        {label} ↓
      </a>
    );
  return <span className="text-xs text-gray-400">{label}</span>;
};
