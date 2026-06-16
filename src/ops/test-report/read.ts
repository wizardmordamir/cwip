import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { TestRunReport, TestRunSummary } from './types';

// `id`/artifact names are filename stems a runner chose; constrain them so a
// client can never escape the reports dir. Shared by both apps' report handlers
// (which were hand-rolling this).
export const SAFE_REPORT_ID = /^[A-Za-z0-9._-]+$/;

/** Read one run's full report JSON by id, or null if missing/unsafe/corrupt. */
export const readReport = (dir: string, id: string): TestRunReport | null => {
  if (!SAFE_REPORT_ID.test(id)) return null;
  const file = join(dir, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as TestRunReport;
  } catch {
    return null;
  }
};

/** Newest-first run summaries (no per-test detail / logs) — the list endpoint shape. */
export const readReportSummaries = (dir: string): TestRunSummary[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readReport(dir, f.slice(0, -5)))
    .filter((r): r is TestRunReport => r !== null)
    .map((r) => ({
      id: r.id,
      label: r.label,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      totals: r.totals,
      mode: r.meta?.mode,
    }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
};

/**
 * Resolve an artifact file for a run to an absolute path under `<dir>/<id>-artifacts/`,
 * or null if the id/name is unsafe, escapes the dir, or the file is missing. The
 * app's artifact route (`GET …/:id/artifacts/:name`) sends the returned path.
 */
export const resolveArtifactPath = (dir: string, id: string, name: string): string | null => {
  if (!SAFE_REPORT_ID.test(id) || !SAFE_REPORT_ID.test(name)) return null;
  const artDir = resolve(dir, `${id}-artifacts`);
  const abs = resolve(artDir, name);
  // Defense in depth: the resolved path must stay inside the artifacts dir.
  if (abs !== artDir && !abs.startsWith(`${artDir}/`)) return null;
  if (!existsSync(abs)) return null;
  return abs;
};
