/**
 * Auto-tiering: pick the optimal {model, think} for a task from its title/body/
 * repo/scope, ONCE, the moment it becomes eligible (classify-on-eligible). The
 * engine writes the verdict back as an EXPLICIT model/think — and that explicit
 * value IS the "already-assessed" marker (see {@link needsTiering}): there is no
 * separate flag and no recurring re-scan, so assessment is idempotent BY
 * CONSTRUCTION. Only an unset/`auto` model is assessed; an owner-set alias is
 * respected and never touched (the owner re-tiers by setting it back to `auto`).
 *
 * The classifier is **heuristics-first** and pure (no token cost for the common
 * case): a clear "heavy" or "light" signal in the text decides the tier
 * deterministically. Only a genuinely AMBIGUOUS task (no signal either way) falls
 * back to the conservative default — and an app may then refine it with one cheap
 * model call by injecting a {@link TierClassifier}. cwip stays driver-agnostic and
 * runtime-free: the LLM call, if any, lives in the consumer (rubato's drainer),
 * which computes a {@link TierVerdict} and passes it in.
 */

import { getTask } from './tasks';
import { withTx } from './tx';
import { type ModelAlias, needsTiering, type TaskqDb, type ThinkLevel } from './types';

/** The text/scope a tier decision is made from (a task row's relevant fields). */
export interface TierInput {
  title: string;
  body?: string | null;
  repo?: string | null;
  model?: string | null;
}

/** The chosen tier + how it was reached. */
export interface TierVerdict {
  model: ModelAlias;
  think: ThinkLevel;
  /** `heuristic` = a keyword decided it; `ambiguous` = no signal → conservative default. */
  confidence: 'heuristic' | 'ambiguous';
  /** Human-readable why (the matched signal, or "no signal"). */
  reason: string;
}

/**
 * An optional override for the pure heuristic — e.g. a consumer that backs
 * ambiguous cases with a cheap model call. Return a verdict to use it, or null to
 * fall through to {@link classifyTier}. Synchronous BY DESIGN: cwip never makes the
 * call itself; the consumer does its (async) work first and passes the result.
 */
export type TierClassifier = (input: TierInput) => TierVerdict | null;

/**
 * HEAVY signals → opus/max. Genuinely hard work where under-powering risks a wrong
 * or shallow result: schema/API/architecture/security/engine/from-scratch/
 * cross-cutting and close kin. Checked FIRST (heavy wins over light) because a
 * false-negative on complexity costs far more than a few wasted tokens — e.g.
 * "schema migration" matches both lists and must land on opus.
 */
const HEAVY = [
  /\bschemas?\b/,
  /\bapi\b/,
  /\bendpoints?\b/,
  /\barchitect(ure|ural)?\b/,
  /\bsecur(e|ity)\b/,
  /\bauth(entication|orization)?\b/,
  /\boauth\b/,
  /\bcrypto(graphy|graphic)?\b/,
  /\bencrypt(ion)?\b/,
  /\bengine\b/,
  /\bfrom[ -]scratch\b/,
  /\bground[ -]up\b/,
  /\bcross[ -]cutting\b/,
  /\bconcurren(t|cy)\b/,
  /\bdistributed\b/,
  /\bprotocol\b/,
  /\bparser?\b/,
  /\bcompiler\b/,
  /\balgorithm(s|ic)?\b/,
  /\bstate[ -]machine\b/,
  /\bdata[ -]model\b/,
  /\bre(design|architect|write)\b/,
];

/**
 * LIGHT signals → sonnet/medium. Mechanical, well-scoped work a cheaper model
 * handles well: doc/migration/small-fix/2D-game/UI-tweak and close kin.
 */
const LIGHT = [
  /\bdocs?\b/,
  /\bdocumentation\b/,
  /\breadme\b/,
  /\bchangelog\b/,
  /\bcomments?\b/,
  /\btypos?\b/,
  /\brenam(e|ing)\b/,
  /\bsmall[ -]fix\b/,
  /\bminor\b/,
  /\btweaks?\b/,
  /\bui[ -]tweak\b/,
  /\bcss\b/,
  /\bstyl(e|ing)\b/,
  /\b2d[ -]game\b/,
  /\bcopy(writing|edit)?\b/,
  /\bwording\b/,
  /\blint(ing)?\b/,
  /\bformat(ting)?\b/,
  /\bmigrat(e|ion)\b/,
];

/** Conservative default for an ambiguous task: capable but not maxed. */
const AMBIGUOUS_DEFAULT: Omit<TierVerdict, 'reason'> = { model: 'opus', think: 'high', confidence: 'ambiguous' };

function firstMatch(haystack: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = haystack.match(p);
    if (m) return m[0];
  }
  return null;
}

/**
 * The pure heuristic: pick a tier from a task's text/scope. Deterministic, no I/O.
 *   - any HEAVY signal           → opus/max  (heavy wins over light)
 *   - else any LIGHT signal      → sonnet/medium
 *   - else (no signal)           → opus/high, confidence `ambiguous`
 * The ambiguous branch is intentionally conservative (over-powering is cheaper
 * than under-powering); a consumer can refine it via a {@link TierClassifier}.
 */
export function classifyTier(input: TierInput): TierVerdict {
  const hay = `${input.title} ${input.body ?? ''} ${input.repo ?? ''}`.toLowerCase();
  const heavy = firstMatch(hay, HEAVY);
  if (heavy) return { model: 'opus', think: 'max', confidence: 'heuristic', reason: `heavy signal: "${heavy}"` };
  const light = firstMatch(hay, LIGHT);
  if (light) return { model: 'sonnet', think: 'medium', confidence: 'heuristic', reason: `light signal: "${light}"` };
  return { ...AMBIGUOUS_DEFAULT, reason: 'no signal — conservative default' };
}

/** Options shared by the auto-tier write paths. */
export interface AutoTierOpts {
  /** Override the heuristic (e.g. a model-backed classifier); null falls through. */
  classify?: TierClassifier;
  /** A precomputed verdict to apply directly (e.g. a consumer's async result). */
  verdict?: TierVerdict;
}

/**
 * The verdict for a task that still needs tiering, or null if it's already
 * explicit (owner-set or previously assessed) — the "respect explicit, idempotent
 * by construction" gate. Read-only: computes, never writes.
 */
export function tierVerdictFor(input: TierInput, opts: AutoTierOpts = {}): TierVerdict | null {
  if (!needsTiering(input.model)) return null;
  return opts.verdict ?? opts.classify?.(input) ?? classifyTier(input);
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

/**
 * Write an explicit tier onto a task — the raw, NON-transactional primitive (call
 * it inside an existing transaction, e.g. the claim txn). Bypasses
 * {@link updateTask}'s own `withTx` (which isn't nestable) and its validation,
 * which is safe because a {@link TierVerdict} is always a valid alias + think
 * level. Touches only `model`/`think` — never status, disposition, or deps.
 */
export function applyTier(db: TaskqDb, id: number, verdict: TierVerdict): void {
  db.run(`UPDATE tasks SET model = ?, think = ?, updated_at = ${NOW} WHERE id = ?`, verdict.model, verdict.think, id);
}

/**
 * Assess + persist a tier for ONE task IF it needs tiering, in its own
 * transaction. Returns the verdict written, or null when the task is missing or
 * already explicit (untouched — the idempotency guarantee). The standalone
 * primitive a drainer calls to tier a specific eligible task before claiming; the
 * claim path ({@link claimNext}/{@link claim}) tiers inline via {@link applyTier}.
 */
export function autoTierTask(db: TaskqDb, id: number, opts: AutoTierOpts = {}): TierVerdict | null {
  return withTx(db, () => {
    const task = getTask(db, id);
    if (!task) return null;
    const verdict = tierVerdictFor(task, opts);
    if (!verdict) return null;
    // We're already inside a txn and model/think are the only fields, so the raw
    // write is correct and atomic here (updateTask would re-open a non-nestable txn).
    applyTier(db, id, verdict);
    return verdict;
  });
}
