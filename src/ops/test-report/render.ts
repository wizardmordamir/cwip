import type { TestArtifact, TestRunReport } from './types';

/** A one-line summary: `functional: 42 passed, 1 failed, 0 skipped (3.2s)`. */
export const summarizeReport = (r: TestRunReport): string => {
  const t = r.totals;
  const secs = r.durationMs != null ? ` (${(r.durationMs / 1000).toFixed(1)}s)` : '';
  return `${r.label}: ${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped${secs}`;
};

const safeJson = (v: unknown): string => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

/** A plain-text report — suitable for CI logs and a gitignored reports dir. */
export const renderReportText = (r: TestRunReport): string => {
  const lines: string[] = [];
  lines.push(`# ${r.label} test run ${r.id}`);
  lines.push(summarizeReport(r));
  lines.push('');
  for (const c of r.cases) {
    const mark = c.status === 'passed' ? '✓' : c.status === 'failed' ? '✗' : c.status === 'skipped' ? '○' : '·';
    const dur = c.durationMs != null ? ` (${c.durationMs}ms)` : '';
    lines.push(`${mark} ${c.suite ? `${c.suite} › ` : ''}${c.name}${dur}`);
    if (c.status === 'failed' && c.error) {
      lines.push(`    ${c.error.message}`);
      if (c.error.stack) for (const s of c.error.stack.split('\n').slice(0, 8)) lines.push(`    ${s}`);
      if (c.context) lines.push(`    context: ${safeJson(c.context)}`);
    }
    if (c.artifacts?.length) {
      for (const a of c.artifacts) lines.push(`    [${a.kind}] ${a.name}${a.path ? ` → ${a.path}` : ''}`);
    }
  }
  return `${lines.join('\n')}\n`;
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Render a case's artifacts as standalone HTML: screenshots inline, everything
// else as a link (paths are relative to the reports dir, where the .html lives).
const renderArtifacts = (artifacts: TestArtifact[]): string => {
  const parts = artifacts
    .map((a) => {
      if (!a.path && !a.inline) return '';
      if (a.kind === 'screenshot' && a.path) {
        return `<figure class="art"><img src="${esc(a.path)}" alt="${esc(a.name)}" loading="lazy"><figcaption>${esc(a.name)}</figcaption></figure>`;
      }
      if (a.inline && (a.kind === 'log' || a.kind === 'text' || a.kind === 'network' || a.kind === 'json')) {
        return `<details class="art"><summary>${esc(a.kind)}: ${esc(a.name)}</summary><pre>${esc(a.inline)}</pre></details>`;
      }
      if (a.path) {
        return `<a class="art-link" href="${esc(a.path)}">${esc(a.kind)}: ${esc(a.name)}</a>`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
  return parts ? `<div class="arts">${parts}</div>` : '';
};

/** A self-contained HTML report — what the admin surface can render or link to. */
export const renderReportHtml = (r: TestRunReport): string => {
  const t = r.totals;
  const rows = r.cases
    .map((c) => {
      const cls = `st-${c.status}`;
      const err =
        c.status === 'failed' && c.error
          ? `<pre class="err">${esc(c.error.message)}\n${esc(c.error.stack ?? '')}</pre>` +
            (c.context ? `<pre class="ctx">${esc(safeJson(c.context))}</pre>` : '')
          : '';
      const arts = c.artifacts?.length ? renderArtifacts(c.artifacts) : '';
      const extra = err || arts ? `<tr><td colspan="4">${err}${arts}</td></tr>` : '';
      return `<tr class="${cls}"><td>${esc(c.status)}</td><td>${esc(c.suite ?? '')}</td><td>${esc(
        c.name,
      )}</td><td>${c.durationMs ?? ''}</td></tr>${extra}`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.label)} ${esc(r.id)}</title>
<style>
  body{font:14px system-ui,sans-serif;margin:2rem;color:#1a1a1a}
  h1{font-size:1.2rem} .sum{margin:.5rem 0 1rem;font-weight:600}
  table{border-collapse:collapse;width:100%} td{border-bottom:1px solid #eee;padding:.35rem .5rem;vertical-align:top}
  .st-passed td:first-child{color:#0a7d28} .st-failed td:first-child{color:#c0271a;font-weight:700}
  .st-skipped td:first-child{color:#9a6700} pre{margin:.25rem 0;white-space:pre-wrap;font-size:12px}
  .err{background:#fff4f3;border-left:3px solid #c0271a;padding:.5rem} .ctx{background:#f6f8fa;padding:.5rem}
  .arts{display:flex;flex-wrap:wrap;gap:.75rem;margin:.5rem 0} .art img{max-width:320px;border:1px solid #ddd;border-radius:4px}
  .art figcaption{font-size:11px;color:#666} .art-link{font-size:12px} details.art{font-size:12px}
</style></head><body>
<h1>${esc(r.label)} test run — ${esc(r.id)}</h1>
<div class="sum">${esc(summarizeReport(r))}${r.totals.failed ? ' — FAILURES' : ''}</div>
<table><thead><tr><th>status</th><th>suite</th><th>test</th><th>ms</th></tr></thead><tbody>
${rows}
</tbody></table>
<p style="color:#888;margin-top:1rem">total ${t.total} · passed ${t.passed} · failed ${t.failed} · skipped ${t.skipped} · todo ${t.todo}</p>
</body></html>`;
};
