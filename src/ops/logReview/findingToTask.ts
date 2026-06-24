import type { Finding } from './types';

/**
 * A queue-ready follow-up task derived from a finding. Structurally a subset of
 * taskq's `NewTask`, so the consumer passes it straight to `addTask` — but this
 * module stays decoupled from the taskq engine (ops must not depend on services).
 */
export interface LogReviewTaskDraft {
  title: string;
  body: string;
  /** Stable, derived from the finding's dedupeKey → re-filing the same issue is idempotent (slug is UNIQUE). */
  slug: string;
  repo?: string;
  /** A no-op completion is acceptable: the fix is investigate-then-fix-if-warranted. */
  noop_ok: boolean;
}

export interface FindingToTaskContext {
  /** Repo the fix task targets (e.g. 'ca' | 'ru'). */
  repo?: string;
  /** Optional slug prefix (default 'log-review'). */
  slugPrefix?: string;
}

/** Lowercase-kebab a string into a slug-safe fragment. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function tag(kind: Finding['kind']): string {
  if (kind === 'error_spike') return 'reliability';
  if (kind === 'host_anomaly') return 'ops';
  return 'perf';
}

function statsBlock(stats: Record<string, number>): string {
  const lines = Object.entries(stats).map(([k, v]) => `- ${k}: ${v}`);
  return lines.join('\n');
}

/**
 * Map a {@link Finding} to a well-formed, idempotent follow-up task draft. The
 * slug is derived from the finding's stable `dedupeKey`, so the same recurring
 * issue always maps to the same slug — re-filing is a no-op at the queue layer.
 */
export function findingToTaskDraft(finding: Finding, ctx: FindingToTaskContext = {}): LogReviewTaskDraft {
  const prefix = ctx.slugPrefix ?? 'log-review';
  const slug = `${prefix}-${slugify(finding.dedupeKey)}`;
  const repoLabel = ctx.repo ? `${ctx.repo}: ` : '';
  const sevTag = finding.severity === 'critical' ? '!! ' : '';
  const title = `[${tag(finding.kind)}] ${sevTag}${repoLabel}${finding.summary}`;
  const window = `${new Date(finding.windowFromTs).toISOString()} → ${new Date(finding.windowToTs).toISOString()}`;
  const body = [
    `Auto-filed by the recurring log-review job (${finding.severity}).`,
    '',
    `**Kind:** ${finding.kind}`,
    finding.route ? `**Route:** ${finding.method ?? ''} ${finding.route}`.trim() : null,
    `**Window:** ${window}`,
    '',
    '**Stats:**',
    statsBlock(finding.stats),
    '',
    'Investigate the bottleneck/spike, confirm whether it is a real regression (vs. a transient blip),',
    'and land a fix if warranted. If it was transient/expected, close as a no-op with a note.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { title, body, slug, repo: ctx.repo, noop_ok: true };
}
