import type { SiteSmokeResult, SiteSmokeVerdict } from './types';

/** Where the failing site lives — drives the heal-task slug + workflow wording. */
export type HealTarget = 'integration' | 'main';

export interface SiteSmokeHealOptions {
  /** `integration` (gate) or `main` (watchdog catching what the owner hit). */
  target: HealTarget;
  /** How the owner reproduces it (e.g. `bun run dev`). Shown in the heal body. */
  reproduceCmd?: string;
}

/** The deduped, crash-loop-safe heal slug for a repo's site-smoke failure. */
export function siteSmokeHealSlug(repo: string, target: HealTarget): string {
  return `heal-${repo}-${target}`;
}

/** A one-line summary of WHY the site smoke is red (for the task title / logs). */
export function siteSmokeHealReason(verdict: SiteSmokeVerdict): string {
  if (verdict.failed.length === 0) return 'site smoke red (no route detail)';
  const importFails = verdict.failed.filter((v) => v.importError);
  const lead = importFails[0] ?? verdict.failed[0];
  const kind = importFails.length ? 'import/resolve failure' : lead.reason.replace('-', ' ');
  return `${kind} on ${lead.path}`;
}

/**
 * Build the deduped heal-task body — names the EXACT failing route(s) + the verbatim
 * console/import error, so a worker can reproduce + fix without re-running the smoke.
 * Import/resolve failures (the "site will not load" class) are listed first.
 */
export function siteSmokeHealBody(result: SiteSmokeResult, opts: SiteSmokeHealOptions): string {
  const v = result.verdict;
  const onMain = opts.target === 'main';
  const intro = onMain
    ? `P0 — ${result.repo}'s site WILL NOT LOAD on main (the owner's localhost): the headless site load+navigate smoke loads the running site and navigates the key routes, and ${result.detail}. This slipped past the build + boot + single-page render gate (exactly the dev import-analysis class a cached/eager build misses).`
    : `P0 — ${result.repo}'s site WILL NOT LOAD on refactor/integration: the headless site load+navigate smoke (boot the real server, navigate every key route in a headless browser) found ${result.detail}. The promotion gate cannot advance main.`;

  const failed = v?.failed ?? [];
  const ordered = [...failed].sort((a, b) => Number(b.importError) - Number(a.importError));
  const routeLines = ordered.length
    ? ordered
        .map((f) => `  • ${f.path}${f.label && f.label !== f.path ? ` (${f.label})` : ''} — [${f.reason}] ${f.detail}`)
        .join('\n')
    : '  (no per-route detail captured)';

  const workflow = onMain
    ? `WORKFLOW: main is PROMOTION-ONLY — do NOT commit on main. Reproduce + fix ON refactor/integration (branch a worktree FROM it, named <slug>-integration), then merge back to refactor/integration; the gate re-promotes main once the whole system is green + the site smoke passes.`
    : `WORKFLOW: branch a worktree FROM refactor/integration (name it <slug>-integration), fix, verify THIS repo builds (\`bun run build\`), then merge back to refactor/integration — NEVER main.`;

  const reproduce = opts.reproduceCmd
    ? `REPRODUCE: run \`${opts.reproduceCmd}\` the way the owner does, open each failing route above in a browser, and watch the dev server + browser console for the named import/resolve error.`
    : `REPRODUCE: boot the site the way the owner runs it, open each failing route above, and watch the dev server + browser console for the named error.`;

  const setup = `FIRST in a fresh worktree: \`bun run setup\` (or \`bun i\`) then \`bun run relink\` — first-party deps (cwip/cursedbelt) are SYMLINKED, never bun-link-copied; do NOT "fix" a missing export by downgrading code.`;

  return [
    intro,
    '',
    'FAILING ROUTES:',
    routeLines,
    '',
    workflow,
    setup,
    reproduce,
    '',
    'Recent server output:',
    result.logTail || '(none)',
  ].join('\n');
}
