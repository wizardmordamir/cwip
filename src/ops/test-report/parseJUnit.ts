import { emptyTotals, type TestCaseResult, type TestRunTotals, type TestStatus } from './types';

// Minimal JUnit XML → cwip test-case parser. Handles the dialects Bun's test
// runner and Playwright emit: nested <testsuite>s, self-closing <testcase/> for
// passes, and <failure>/<error>/<skipped> children for the rest. No XML dep — the
// JUnit subset is regular enough to scan directly, which keeps cwip dependency-free.

const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#9;/g, '\t')
    .replace(/&amp;/g, '&'); // last, so a literal &amp;lt; survives correctly

const attr = (tag: string, name: string): string | undefined => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : undefined;
};

export interface ParsedJUnit {
  cases: TestCaseResult[];
  totals: TestRunTotals;
}

/**
 * Parse a JUnit XML string into cwip TestCaseResults + totals. Each <testcase>
 * becomes one case: `passed` unless it carries a <failure>/<error> (→ `failed`)
 * or <skipped> (→ `skipped`). The failure message/stack are captured for the
 * report. `suite` is the testcase's classname (or its enclosing suite name).
 */
export const parseJUnitXml = (xml: string): ParsedJUnit => {
  const cases: TestCaseResult[] = [];
  const totals = emptyTotals();

  // Match both self-closing <testcase .../> and <testcase ...>…</testcase>.
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[3] ?? '';
    const name = attr(attrs, 'name') ?? '(unnamed)';
    const suite = attr(attrs, 'classname') ?? attr(attrs, 'name');
    const file = attr(attrs, 'file');
    const timeSec = Number(attr(attrs, 'time') ?? '0');
    const durationMs = Number.isFinite(timeSec) ? Math.round(timeSec * 1000) : undefined;

    let status: TestStatus = 'passed';
    let error: TestCaseResult['error'];

    const failMatch = inner.match(/<(failure|error)\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:failure|error)>)/);
    if (failMatch) {
      status = 'failed';
      const message = attr(failMatch[2], 'message') ?? 'failed';
      const stack = (failMatch[3] ?? '').trim();
      error = { message, stack: stack ? decodeEntities(stack) : undefined };
    } else if (/<skipped\b/.test(inner)) {
      status = 'skipped';
    }

    cases.push({ name, suite: suite === name ? undefined : suite, file, status, durationMs, error });
    totals.total += 1;
    totals[status] += 1;
  }

  return { cases, totals };
};
