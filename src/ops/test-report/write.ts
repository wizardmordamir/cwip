import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderReportHtml, renderReportText } from './render';
import type { TestArtifact, TestRunReport } from './types';

export interface WrittenReport {
  dir: string;
  json: string;
  html: string;
  txt: string;
  /** The per-run artifacts dir, if any artifacts were materialized. */
  artifactsDir?: string;
}

const EXT_BY_KIND: Record<string, string> = {
  screenshot: 'png',
  html: 'html',
  log: 'log',
  network: 'json',
  trace: 'zip',
  video: 'webm',
  json: 'json',
  text: 'txt',
};

const extFor = (a: TestArtifact): string => {
  if (a.path) return a.path.split('.').pop() ?? 'bin';
  if (a.sourcePath) return a.sourcePath.split('.').pop() ?? 'bin';
  return EXT_BY_KIND[a.kind] ?? 'bin';
};

const slug = (s: string): string => s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';

// Persist a case's artifacts (inline content or a sourcePath file) into the run's
// artifacts dir, rewriting each artifact's `path` to a ref relative to `dir`.
const materializeArtifacts = (dir: string, reportId: string, artifacts: TestArtifact[], caseIndex: number): boolean => {
  let wrote = false;
  const artDirName = `${reportId}-artifacts`;
  const artDirAbs = join(dir, artDirName);
  artifacts.forEach((a, i) => {
    if (a.path) return; // already persisted
    const ext = extFor(a);
    // Don't double-suffix when the artifact name already ends in that extension
    // (e.g. `login.png` → `…-login.png`, not `…-login.png.png`).
    const stem = slug(a.name).toLowerCase().endsWith(`.${ext}`)
      ? slug(a.name).slice(0, -(ext.length + 1))
      : slug(a.name);
    const filename = `${caseIndex}-${i}-${stem}.${ext}`;
    const abs = join(artDirAbs, filename);
    if (!wrote) {
      mkdirSync(artDirAbs, { recursive: true });
      wrote = true;
    }
    if (a.sourcePath && existsSync(a.sourcePath)) {
      copyFileSync(a.sourcePath, abs);
    } else if (a.inline !== undefined) {
      writeFileSync(abs, a.inline);
    } else {
      return;
    }
    a.path = `${artDirName}/${filename}`;
    a.bytes = statSync(abs).size;
    a.sourcePath = undefined;
    // Keep small inline text for convenient rendering; drop large blobs to keep JSON lean.
    if (a.inline !== undefined && a.inline.length > 8192) a.inline = undefined;
  });
  return wrote;
};

/**
 * Persist a report as `<id>.json`, `<id>.html`, `<id>.txt` under `dir`, plus any
 * case artifacts into `<id>-artifacts/`. The JSON is the source of truth an
 * admin/UI reads; the html/txt are human-friendly. Artifacts authored with
 * `inline` content or a `sourcePath` are written/copied in and their `path` is
 * rewritten to a ref relative to `dir` (so the html opens standalone and the app's
 * artifact route can serve them). The `dir` is created if missing.
 */
export const writeReportFiles = (dir: string, report: TestRunReport): WrittenReport => {
  mkdirSync(dir, { recursive: true });
  let anyArtifacts = false;
  report.cases.forEach((c, idx) => {
    if (c.artifacts?.length) anyArtifacts = materializeArtifacts(dir, report.id, c.artifacts, idx) || anyArtifacts;
  });

  const json = join(dir, `${report.id}.json`);
  const html = join(dir, `${report.id}.html`);
  const txt = join(dir, `${report.id}.txt`);
  writeFileSync(json, JSON.stringify(report, null, 2));
  writeFileSync(html, renderReportHtml(report));
  writeFileSync(txt, renderReportText(report));
  const out: WrittenReport = { dir, json, html, txt };
  if (anyArtifacts) out.artifactsDir = join(dir, `${report.id}-artifacts`);
  return out;
};
