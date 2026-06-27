/**
 * Continuous-improvement findings ledger — the idempotency backbone for recurring
 * quality detectors (drift / cve / log-review / orchestration-hygiene / …).
 *
 * THE CONTRACT (why this exists): a recurring detector must be able to run every
 * sweep WITHOUT re-flagging a choice that was already fixed or deliberately
 * accepted. Every issue gets a STABLE {@link findingFingerprint} (a normalized hash
 * of type + location + description), and a detector UPSERTS by that fingerprint:
 *
 *   - already present in ANY status  → {@link recordFinding} does NOTHING (no
 *     duplicate row, no second fix task). The fingerprint's UNIQUE constraint makes
 *     this race-safe across concurrent detectors with no outer transaction.
 *   - a genuinely NEW fingerprint     → an OPEN finding is inserted AND a focused fix
 *     taskq task is auto-created and linked (`fix_task`). When that task completes,
 *     the finding auto-resolves to `fixed` (the completion path calls
 *     {@link resolveFindingsForTask}).
 *
 * A finding can also be marked `accepted` / `wontfix` — a deliberate "this choice is
 * actually optimal" or a conscious defer — by the fix-task worker (if it judges the
 * flagged choice optimal) or by the owner. Both are terminal: the fingerprint stays
 * in the ledger so it is NEVER re-flagged, even though no code changed.
 *
 * Pure + driver-agnostic like the rest of taskq: no `bun:*`/`node:*` import (the
 * fingerprint hash is pure JS), so cwip stays browser-safe and the ledger is
 * unit-testable against an in-memory handle.
 */

import { addTask, type Position } from './tasks';
import type { NewTask, TaskqDb } from './types';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

// ── Vocabulary ──────────────────────────────────────────────────────────────────

/**
 * Canonical finding types — the shared vocabulary the recurring detectors emit and
 * the UI groups by. NOT a closed set: {@link recordFinding} accepts any non-empty
 * type string (detectors evolve), but these are the known ones a UI can render with
 * a label/colour. `other` is the catch-all.
 */
export const FINDING_TYPES = [
  'anchoring',
  'duplication',
  'inconsistent-api',
  'leaky-interface',
  'bad-schema',
  'weak-ux',
  'drift',
  'cve',
  'perf',
  'hygiene',
  'other',
] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

/** True when `t` is one of the {@link FINDING_TYPES} (an unknown type is still valid). */
export function isKnownFindingType(t: string): t is FindingType {
  return (FINDING_TYPES as readonly string[]).includes(t);
}

/**
 * Finding lifecycle. `open` → `in_progress` → `fixed` is the resolution path; a
 * finding may instead be parked terminal as `accepted` (the choice is optimal) or
 * `wontfix` (a conscious defer). The three RESOLVED states stamp `resolved_at` and
 * are never re-flagged.
 */
export const FINDING_STATUSES = ['open', 'in_progress', 'fixed', 'accepted', 'wontfix'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

/** The terminal/resolved statuses — a finding here is closed and stamps `resolved_at`. */
export const RESOLVED_FINDING_STATUSES = ['fixed', 'accepted', 'wontfix'] as const;

/** The OPEN (still-actionable) statuses — the worklist a detector / the UI cares about. */
export const OPEN_FINDING_STATUSES = ['open', 'in_progress'] as const;

/** Severity ordered low→high; the UI sorts/filters by it and a detector picks one. */
export const FINDING_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export function isFindingStatus(s: string): s is FindingStatus {
  return (FINDING_STATUSES as readonly string[]).includes(s);
}
export function isFindingSeverity(s: string): s is FindingSeverity {
  return (FINDING_SEVERITIES as readonly string[]).includes(s);
}
/** True when `s` is a RESOLVED status (`fixed` / `accepted` / `wontfix`). */
export function isResolvedFindingStatus(s: string): s is (typeof RESOLVED_FINDING_STATUSES)[number] {
  return (RESOLVED_FINDING_STATUSES as readonly string[]).includes(s);
}

// ── Rows / inputs ────────────────────────────────────────────────────────────────

/** A row of the `findings` table (verbatim columns). */
export interface FindingRow {
  id: number;
  /** Stable identity: the normalized hash of (type, location, description). UNIQUE. */
  fingerprint: string;
  type: string;
  /** Where the issue lives — a module / file / area; part of the fingerprint. */
  location: string;
  description: string;
  severity: string;
  status: FindingStatus;
  /** Which recurring detector recorded it (provenance), or null. */
  detector: string | null;
  /** The linked fix task (FK → tasks.id), or null if none / de-linked. */
  fix_task: number | null;
  /** Free-text context — e.g. WHY a finding was accepted / wontfix. */
  note: string | null;
  created_at: string;
  updated_at: string;
  /** When it became fixed/accepted/wontfix; null while open/in_progress. */
  resolved_at: string | null;
}

/** What a detector reports for a single issue. */
export interface NewFinding {
  /** Issue type — a {@link FindingType} ideally, but any non-empty string is accepted. */
  type: string;
  /** Module / file / area the issue lives in (part of the fingerprint). */
  location: string;
  description: string;
  /** Defaults to `medium`. */
  severity?: FindingSeverity;
  /** The detector's name, for provenance (e.g. `fu-drift-audit-recurring`). */
  detector?: string;
  /**
   * Target repo for the auto-created fix task (app1 | app2 | app3), so the orchestrator
   * claims it for the right worktree. Omit if the detector can't attribute a repo.
   */
  repo?: string;
  /**
   * Override the computed fingerprint. Almost never needed — only for importing a
   * pre-existing ledger or pinning identity that the normalized text can't express.
   */
  fingerprint?: string;
}

// ── Fingerprint ──────────────────────────────────────────────────────────────────

/**
 * Normalize a fingerprint field so cosmetic differences (case, whitespace, a
 * trailing period) don't fork the identity of the SAME issue across sweeps —
 * while keeping genuinely distinct issues distinct.
 */
function normalizeField(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/, '')
    .trim();
}

// Pure, deterministic 64-bit FNV-1a (BigInt) over the UTF-16 code units. No clock,
// no RNG, no node:crypto — so taskq stays dependency-free and the fingerprint is
// byte-identical on every machine. Two passes with distinct offset bases compose a
// 128-bit fingerprint (32 hex chars): collision-free at this ledger's scale.
const FNV_PRIME = 0x100000001b3n;
const MASK64 = (1n << 64n) - 1n;
function fnv1a64(input: string, offsetBasis: bigint): bigint {
  let h = offsetBasis;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * FNV_PRIME) & MASK64;
  }
  return h;
}
const hex16 = (n: bigint): string => n.toString(16).padStart(16, '0');

/**
 * The STABLE id for an issue: a normalized hash of `type` + `location` +
 * `description`. The SAME issue (modulo case/whitespace/trailing punctuation)
 * fingerprints identically across sweeps — so a detector recognizes it and never
 * re-files it — while a re-introduction after a fix produces the same fingerprint
 * and is re-caught. Fields are joined with a NUL so distinct field boundaries can't
 * alias (`a|bc` vs `ab|c`).
 */
export function findingFingerprint(input: Pick<NewFinding, 'type' | 'location' | 'description'>): string {
  const canonical = [
    normalizeField(input.type),
    normalizeField(input.location),
    normalizeField(input.description),
  ].join('\u0000');
  return hex16(fnv1a64(canonical, 0xcbf29ce484222325n)) + hex16(fnv1a64(canonical, 0x84222325cbf29ce4n));
}

// ── Validation ───────────────────────────────────────────────────────────────────

/** Human-readable problems with a {@link NewFinding}; empty ⇒ valid. */
export function validateNewFinding(f: NewFinding): string[] {
  const errs: string[] = [];
  if (!(f.type ?? '').trim()) errs.push('type is required');
  if (!(f.location ?? '').trim()) errs.push('location is required');
  if (!(f.description ?? '').trim()) errs.push('description is required');
  if (f.severity != null && !isFindingSeverity(f.severity)) {
    errs.push(`invalid severity "${f.severity}" (use ${FINDING_SEVERITIES.join(', ')})`);
  }
  return errs;
}

function assertValidNewFinding(f: NewFinding): void {
  const errs = validateNewFinding(f);
  if (errs.length) throw new Error(`invalid finding: ${errs.join('; ')}`);
}

// ── Reads ────────────────────────────────────────────────────────────────────────

export function getFinding(db: TaskqDb, id: number): FindingRow | null {
  return (db.query(`SELECT * FROM findings WHERE id = ?`).get(id) as FindingRow | undefined | null) ?? null;
}

export function getFindingByFingerprint(db: TaskqDb, fingerprint: string): FindingRow | null {
  return (
    (db.query(`SELECT * FROM findings WHERE fingerprint = ?`).get(fingerprint) as FindingRow | undefined | null) ?? null
  );
}

/** Filters for {@link listFindings}. */
export interface FindingFilters {
  status?: FindingStatus;
  type?: string;
  severity?: FindingSeverity;
  /** Restrict to OPEN findings (status `open` or `in_progress`). Overrides `status`. */
  openOnly?: boolean;
}

/** List findings (newest first), optionally filtered. */
export function listFindings(db: TaskqDb, filters: FindingFilters = {}): FindingRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.openOnly) {
    where.push(`status IN ('open', 'in_progress')`);
  } else if (filters.status) {
    where.push(`status = ?`);
    params.push(filters.status);
  }
  if (filters.type) {
    where.push(`type = ?`);
    params.push(filters.type);
  }
  if (filters.severity) {
    where.push(`severity = ?`);
    params.push(filters.severity);
  }
  const sql = `SELECT * FROM findings${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`;
  return db.query(sql).all(...params) as FindingRow[];
}

/** The OPEN worklist — findings still `open` or `in_progress`, newest first. */
export function listOpenFindings(db: TaskqDb): FindingRow[] {
  return listFindings(db, { openOnly: true });
}

/** A rollup for the UI: totals + counts by status / severity / type, and the open count. */
export interface FindingsSummary {
  total: number;
  open: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export function findingsSummary(db: TaskqDb): FindingsSummary {
  const tally = (col: string): Record<string, number> => {
    const rows = db.query(`SELECT ${col} AS k, COUNT(*) AS c FROM findings GROUP BY ${col}`).all() as {
      k: string;
      c: number;
    }[];
    return Object.fromEntries(rows.map((r) => [r.k, r.c]));
  };
  const byStatus = tally('status');
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const open = (byStatus.open ?? 0) + (byStatus.in_progress ?? 0);
  return { total, open, byStatus, bySeverity: tally('severity'), byType: tally('type') };
}

// ── Record (the detector UPSERT entry point) ──────────────────────────────────────

/** Options controlling {@link recordFinding}'s auto-created fix task. */
export interface RecordFindingOpts {
  /**
   * Build the fix task auto-created for a genuinely NEW finding. Receives the
   * inserted finding row (so it can link back) and returns a {@link NewTask} draft,
   * or null to skip auto-creation. Pass `false` to suppress the fix task entirely.
   * Omit to use {@link defaultFixTask}.
   */
  fixTask?: ((finding: FindingRow) => NewTask | null) | false;
  /** Where the auto-created fix task lands in the queue. Default: bottom. */
  fixTaskPosition?: Position;
}

/** The outcome of {@link recordFinding} — `created` is true ONLY for a new fingerprint. */
export interface RecordFindingResult {
  /** True ⇒ a NEW fingerprint was inserted (and a fix task may have been filed). */
  created: boolean;
  /** The finding row — the existing one when `created` is false. */
  finding: FindingRow;
  /** The auto-created fix task id, or null (existing finding, or auto-create suppressed). */
  fixTaskId: number | null;
}

const FIX_TITLE_MAX = 80;
function truncate(s: string, max: number): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length <= max ? one : `${one.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The default focused fix task for a new finding: a `ready` task titled after the
 * issue, slugged `fix-finding-<id>` (so it's referenceable + uniquely linked), with
 * a body that states the finding and tells the worker how to resolve it — including
 * the escape hatch to ACCEPT/WONTFIX it if the flagged choice is actually optimal,
 * so it is never re-flagged. Exported so a caller can wrap/extend it.
 */
export function defaultFixTask(finding: FindingRow): NewTask {
  return {
    title: `fix(${finding.type}): ${truncate(finding.description, FIX_TITLE_MAX)}`,
    slug: `fix-finding-${finding.id}`,
    status: 'ready',
    body: [
      `Continuous-improvement finding #${finding.id} — type \`${finding.type}\`, severity \`${finding.severity}\`.`,
      '',
      `Location: ${finding.location}`,
      '',
      finding.description,
      '',
      'Resolve it, or — if on inspection the flagged choice is actually OPTIMAL or a',
      'conscious deferral — mark the finding accepted/wontfix instead so it is never',
      `re-flagged: \`taskq findings accept ${finding.id} --note "…"\` (optimal) or`,
      `\`taskq findings wontfix ${finding.id} --note "…"\` (deliberate defer).`,
      '',
      `On completion this fix task auto-resolves finding #${finding.id} → fixed.`,
    ].join('\n'),
    note: `auto-filed from finding #${finding.id} (${finding.type})`,
  };
}

/**
 * Record a detector's finding — the idempotent UPSERT at the heart of the ledger.
 *
 * Idempotency is enforced by the `fingerprint` UNIQUE constraint, NOT by a
 * transaction: the insert is `ON CONFLICT(fingerprint) DO NOTHING`, so an issue
 * already in the ledger in ANY status is a no-op (`created: false`) — race-safe
 * across concurrent detectors. A genuinely new fingerprint inserts an OPEN finding
 * and (unless suppressed) auto-creates a linked fix task via {@link addTask}.
 *
 * NOTE: the finding-insert and the fix-task-insert are deliberately NOT a single
 * transaction — {@link addTask} opens its own (and `withTx` is not reentrant). The
 * UNIQUE constraint already guarantees no duplicate finding; the only cost is a
 * negligible crash window between the two inserts (a new finding briefly without its
 * fix task). That is benign and self-evident in the UI (an open finding, fix_task
 * null), and far preferable to duplicating addTask's positioning/validation/deps.
 */
export function recordFinding(db: TaskqDb, finding: NewFinding, opts: RecordFindingOpts = {}): RecordFindingResult {
  assertValidNewFinding(finding);
  const fingerprint = finding.fingerprint ?? findingFingerprint(finding);

  const res = db.run(
    `INSERT INTO findings (fingerprint, type, location, description, severity, status, detector)
     VALUES (?, ?, ?, ?, ?, 'open', ?)
     ON CONFLICT(fingerprint) DO NOTHING`,
    fingerprint,
    finding.type.trim(),
    finding.location.trim(),
    finding.description.trim(),
    finding.severity ?? 'medium',
    finding.detector ?? null,
  );

  // changes === 0 ⇒ the fingerprint already existed (present run or a concurrent
  // detector won the race). The contract: do NOTHING — return the existing row.
  if (res.changes === 0) {
    const existing = getFindingByFingerprint(db, fingerprint);
    if (!existing) throw new Error(`finding upsert lost a row for fingerprint ${fingerprint}`);
    return { created: false, finding: existing, fixTaskId: existing.fix_task };
  }

  const findingId = Number(res.lastInsertRowid);
  let inserted = getFinding(db, findingId);
  if (!inserted) throw new Error(`finding ${findingId} vanished after insert`);

  // Auto-create the focused fix task (the contract) unless the caller opts out.
  let fixTaskId: number | null = null;
  const builder = opts.fixTask === false ? null : (opts.fixTask ?? defaultFixTask);
  if (builder) {
    const draft = builder(inserted);
    if (draft) {
      // Carry the detector's repo onto the default task draft if it didn't set one,
      // so the orchestrator claims the fix in the right worktree.
      if (draft.repo == null && finding.repo != null) draft.repo = finding.repo;
      fixTaskId = addTask(db, draft, opts.fixTaskPosition ?? { at: 'bottom' });
      db.run(`UPDATE findings SET fix_task = ?, updated_at = ${NOW} WHERE id = ?`, fixTaskId, findingId);
      inserted = getFinding(db, findingId) ?? inserted;
    }
  }
  return { created: true, finding: inserted, fixTaskId };
}

// ── Status transitions ─────────────────────────────────────────────────────────────

/**
 * Set a finding's status. A RESOLVED status (`fixed`/`accepted`/`wontfix`) stamps
 * `resolved_at`; reopening to `open`/`in_progress` clears it. `note` (optional) is
 * the place to record WHY — e.g. the rationale for `accepted`. Throws if `id` is
 * unknown. Single statement: safe to call standalone or inside a caller's txn.
 */
export function setFindingStatus(db: TaskqDb, id: number, status: FindingStatus, note?: string | null): void {
  const resolved = isResolvedFindingStatus(status);
  const sets = [`status = ?`, resolved ? `resolved_at = ${NOW}` : `resolved_at = NULL`];
  const vals: unknown[] = [status];
  if (note !== undefined) {
    sets.push(`note = ?`);
    vals.push(note);
  }
  const res = db.run(`UPDATE findings SET ${sets.join(', ')}, updated_at = ${NOW} WHERE id = ?`, ...vals, id);
  if (res.changes === 0) throw new Error(`finding ${id} not found`);
}

/** Mark a finding `in_progress` (its fix has started). */
export function startFinding(db: TaskqDb, id: number): void {
  setFindingStatus(db, id, 'in_progress');
}
/** Mark a finding `fixed` by hand (the completion path does this automatically). */
export function markFindingFixed(db: TaskqDb, id: number): void {
  setFindingStatus(db, id, 'fixed');
}
/** Accept a finding: the flagged choice is actually optimal — never re-flag it. */
export function acceptFinding(db: TaskqDb, id: number, note?: string | null): void {
  setFindingStatus(db, id, 'accepted', note);
}
/** Won't-fix a finding: a conscious deferral — never re-flag it. */
export function wontfixFinding(db: TaskqDb, id: number, note?: string | null): void {
  setFindingStatus(db, id, 'wontfix', note);
}
/** Reopen a resolved finding (back to `open`, `resolved_at` cleared). */
export function reopenFinding(db: TaskqDb, id: number): void {
  setFindingStatus(db, id, 'open');
}

/**
 * Resolve every OPEN/IN_PROGRESS finding linked to `taskId` → `fixed` (stamping
 * `resolved_at`). The completion path calls this so "fix task done ⇒ finding fixed"
 * is automatic for whoever completes the task. Deliberately skips findings already
 * `accepted`/`wontfix`/`fixed` — those are terminal owner/worker decisions a routine
 * completion must not silently override. Returns the number resolved (0 for a task
 * with no linked findings, so it's safe to call on every completion). Single
 * statement — safe to call inside the completion transaction.
 */
export function resolveFindingsForTask(db: TaskqDb, taskId: number): number {
  return db.run(
    `UPDATE findings SET status = 'fixed', resolved_at = ${NOW}, updated_at = ${NOW}
       WHERE fix_task = ? AND status IN ('open', 'in_progress')`,
    taskId,
  ).changes;
}
