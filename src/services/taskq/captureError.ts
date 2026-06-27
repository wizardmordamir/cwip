/**
 * Capture a server 500 as a DEDUPED taskq "debug this" task.
 *
 * Both apps' error handlers funnel an uncaught 5xx in here (apps can use Hono
 * `app.onError`, a central route error boundary for example). The same error signature
 * updates ONE task — bump a count + last-seen, refresh the representative
 * stack/payload — instead of spawning a duplicate, so a recurring crash is a single
 * growing work item rather than queue spam. A genuinely new crash auto-files a
 * `ready` task the orchestrator can pick up; a crash whose task was already `done`
 * (a regression) re-queues that same task.
 *
 * Operates on a structural {@link TaskqDb} handle — exactly like the rest of the
 * engine — so it stays driver-agnostic and unit-testable in-memory. The app opens
 * the real `~/.taskq` DB (see {@link taskqDbPath}) and passes it in.
 *
 * The full captured detail (route, method, status, message, stack, correlationId,
 * user, redacted payload, timestamps) is rendered into the task body, and a small
 * machine marker (count / first-seen / last-seen / recent occurrences) is stamped in
 * an HTML comment at the top of that body — so the task IS the persisted, deduped
 * record, with no extra schema. Secrets in the payload are redacted HERE before
 * anything is written ({@link redactPayload}); callers pass a SAFE user identifier.
 */

import { errorSignature } from '../../core/error/errorSignature';
import { addTask, getTaskBySlug, updateTask } from './tasks';
import type { TaskqDb } from './types';

export interface ServerErrorCaptureInput {
  /** App slug — namespaces the dedupe key + titles/routes the task (e.g. `app1`, `app2`). */
  app: string;
  method: string;
  url: string;
  status: number;
  name?: string | null;
  message?: string | null;
  stack?: string | null;
  correlationId?: string | null;
  /** A SAFE user identifier (email / id) — never raw credentials. */
  user?: string | null;
  /** Request body; redacted by {@link redactPayload} here before it's ever written. */
  payload?: unknown;
  /** ISO timestamp of this occurrence; defaults to now. */
  at?: string;
  /** Task repo hint for the orchestrator (defaults to `app`). */
  repo?: string;
  /** How many recent occurrence breadcrumbs to retain on the task (default 20). */
  maxOccurrences?: number;
}

export interface ServerErrorCaptureResult {
  taskId: number;
  slug: string;
  signature: string;
  /** true → a new task was created; false → an existing task was bumped. */
  created: boolean;
  /** true → a `done`/`failed` task was re-queued (the bug regressed). */
  reopened: boolean;
  /** Total occurrences now recorded on the task. */
  count: number;
}

const SLUG_PREFIX = 'err500';
const DEFAULT_MAX_OCCURRENCES = 20;
const MAX_PAYLOAD_CHARS = 4000;
const MAX_STRING_CHARS = 500;
const MAX_STACK_CHARS = 4000;

// Keys whose VALUE is masked wholesale in a captured payload — a captured error
// record must never become a credential store. Matches substrings so `userPassword`
// / `x-api-key` / `refreshToken` are all caught.
const SECRET_KEY = /pass|secret|token|cookie|auth|credential|api[-_]?key|otp|\bpin\b|ssn|private/i;

const REDACTED = '***redacted***';

/**
 * Deep-redact a request payload for safe persistence: mask secret-looking keys,
 * truncate long strings, and bound array/object depth + breadth so a giant or
 * binary body can't bloat the task. Pure; returns a JSON-safe structure.
 */
export function redactPayload(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_CHARS ? `${value.slice(0, MAX_STRING_CHARS)}…(${value.length} chars)` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 6) return '…';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactPayload(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? REDACTED : redactPayload(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

// A short, stable, NON-cryptographic hash (djb2 → base36) — just a compact dedupe
// key for the slug. Identical signatures always yield the same slug.
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const appSlug = (app: string): string =>
  app
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'app';

/** The deterministic dedupe slug for an app + error signature. */
export function captureSlug(app: string, signature: string): string {
  return `${SLUG_PREFIX}-${appSlug(app)}-${shortHash(signature)}`;
}

interface Occurrence {
  at: string;
  correlationId: string | null;
  user: string | null;
}

interface DedupeMarker {
  count: number;
  firstSeen: string;
  lastSeen: string;
  recent: Occurrence[];
}

const MARKER_RE = /<!--err500 (\{.*?\})-->/;

// Parse the machine marker stamped in a task body. Tolerant: a body an owner edited
// (or a pre-existing task) that lacks/mangles the marker just reads as "no prior
// state", so the next occurrence starts a fresh count rather than throwing.
function parseMarker(body: string | null | undefined): DedupeMarker | null {
  const m = MARKER_RE.exec(body ?? '');
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as Partial<DedupeMarker>;
    if (typeof parsed.count !== 'number') return null;
    return {
      count: parsed.count,
      firstSeen: parsed.firstSeen ?? '',
      lastSeen: parsed.lastSeen ?? '',
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return null;
  }
}

const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);

function titleFor(input: ServerErrorCaptureInput, sigName: string, route: string): string {
  const detail = truncate(`${sigName}: ${(input.message ?? '').trim()}`.trim(), 80);
  return `[${input.status}] ${input.method} ${route} — ${detail}`;
}

function payloadBlock(value: unknown): string | null {
  if (value === undefined) return null;
  let json: string;
  try {
    json = JSON.stringify(redactPayload(value), null, 2) ?? '';
  } catch {
    return '(unserializable payload)';
  }
  if (!json || json === '{}' || json === 'null') return null;
  return json.length > MAX_PAYLOAD_CHARS ? `${json.slice(0, MAX_PAYLOAD_CHARS)}\n…(truncated)` : json;
}

function renderBody(
  input: ServerErrorCaptureInput,
  sig: { name: string; route: string; signature: string },
  marker: DedupeMarker,
  reopened: boolean,
): string {
  const lines: string[] = [];
  // Machine marker first (an HTML comment — invisible when the body renders as
  // markdown, trivially parseable on the next occurrence).
  lines.push(`<!--err500 ${JSON.stringify(marker)}-->`);
  lines.push('');
  lines.push(
    `Auto-filed by the server error-capture middleware: an uncaught **${input.status}** occurred handling \`${input.method} ${sig.route}\`. Reproduce it, find the root cause, and fix it.`,
  );
  if (reopened) {
    lines.push('');
    lines.push(
      '> ⚠️ This task was previously `done` but the same error **recurred** — it was re-queued as a regression.',
    );
  }
  lines.push('');
  lines.push('## Details');
  lines.push(`- **App:** ${input.app}`);
  lines.push(
    `- **Route:** \`${input.method} ${input.url}\`${input.url !== sig.route ? ` _(grouped as \`${sig.route}\`)_` : ''}`,
  );
  lines.push(`- **Status:** ${input.status}`);
  lines.push(`- **Error:** ${sig.name}: ${truncate((input.message ?? '').trim() || '(no message)', 300)}`);
  lines.push(`- **Occurrences:** ${marker.count} · first seen ${marker.firstSeen} · last seen ${marker.lastSeen}`);
  if (input.correlationId) lines.push(`- **Correlation id (latest):** \`${input.correlationId}\``);
  if (input.user) lines.push(`- **User (latest):** ${input.user}`);
  lines.push(`- **Signature:** \`${sig.signature}\``);

  if (marker.recent.length > 1) {
    lines.push('');
    lines.push('## Recent occurrences');
    for (const o of marker.recent.slice(0, 10)) {
      const bits = [o.at, o.correlationId ? `cid=${o.correlationId}` : null, o.user ? `user=${o.user}` : null]
        .filter(Boolean)
        .join(' · ');
      lines.push(`- ${bits}`);
    }
  }

  if (input.stack) {
    lines.push('');
    lines.push('## Stack');
    lines.push('```');
    lines.push(truncate(input.stack, MAX_STACK_CHARS));
    lines.push('```');
  }

  const payload = payloadBlock(input.payload);
  if (payload) {
    lines.push('');
    lines.push('## Request payload (redacted)');
    lines.push('```json');
    lines.push(payload);
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Record a server 500 into taskq, deduped by error signature. Returns what happened
 * (created vs bumped vs reopened, and the running count). Throwing is the caller's
 * to guard — the app wrappers wrap this in try/catch so error capture can never
 * itself break the response.
 */
export function captureServerError(db: TaskqDb, input: ServerErrorCaptureInput): ServerErrorCaptureResult {
  const sig = errorSignature({
    name: input.name,
    message: input.message,
    method: input.method,
    url: input.url,
    status: input.status,
  });
  const slug = captureSlug(input.app, sig.signature);
  const at = input.at ?? new Date().toISOString();
  const maxRecent = input.maxOccurrences ?? DEFAULT_MAX_OCCURRENCES;
  const occ: Occurrence = { at, correlationId: input.correlationId ?? null, user: input.user ?? null };

  const existing = getTaskBySlug(db, slug);
  if (!existing) {
    const marker: DedupeMarker = { count: 1, firstSeen: at, lastSeen: at, recent: [occ] };
    const taskId = addTask(db, {
      slug,
      title: titleFor(input, sig.name, sig.route),
      body: renderBody(input, sig, marker, false),
      repo: input.repo ?? input.app,
      status: 'ready',
      // model unset → the auto-tier marker classifies it; noop_ok stays false
      // (a real code fix is expected — a no-op "done" is a false-done).
    });
    return { taskId, slug, signature: sig.signature, created: true, reopened: false, count: 1 };
  }

  const prev = parseMarker(existing.body);
  const count = (prev?.count ?? 0) + 1;
  const firstSeen = prev?.firstSeen || at;
  const recent = [occ, ...(prev?.recent ?? [])].slice(0, maxRecent);
  const marker: DedupeMarker = { count, firstSeen, lastSeen: at, recent };
  // A done/failed task whose error recurred is a regression — re-queue it.
  const reopened = existing.status === 'done' || existing.status === 'failed';
  updateTask(db, existing.id, {
    ...(reopened ? { status: 'ready' as const } : {}),
    title: titleFor(input, sig.name, sig.route),
    body: renderBody(input, sig, marker, reopened),
  });
  return { taskId: existing.id, slug, signature: sig.signature, created: false, reopened, count };
}
