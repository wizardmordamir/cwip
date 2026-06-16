/**
 * .env parsing / serialization / comparison — pure, browser-safe, no DOM/Node
 * deps. The shared core behind the apps' ".env editor" tools and the cwip/react
 * `EnvEditor` / `EnvCompare` components, and the single source of truth for the
 * `parseEnvText` used by `cwip/node`'s `loadEnvFile`.
 *
 * The model is a line-oriented `EnvEntry[]` so an editor can round-trip a file
 * faithfully — comments and blank lines are preserved as-is (`raw`), pairs keep
 * their `export ` prefix and original quoting, and only the values a user edits
 * change. `parseEnvText` collapses that to a plain key→value map (last value
 * wins), matching dotenv lookup semantics.
 */

export type EnvEntryKind = 'pair' | 'comment' | 'blank';

export interface EnvEntry {
  kind: EnvEntryKind;
  /** Variable name (`''` for comment/blank lines). */
  key: string;
  /** Unquoted value (`''` for comment/blank lines). */
  value: string;
  /** The original line text — re-emitted verbatim for comment/blank lines. */
  raw: string;
  /** Whether the line carried an `export ` prefix (preserved on re-emit). */
  exported?: boolean;
  /** The quote char that wrapped the value, if any (preserved on re-emit). */
  quote?: '"' | "'" | '';
}

const isWrapped = (value: string, q: string): boolean => value.length >= 2 && value.startsWith(q) && value.endsWith(q);

/**
 * Parse dotenv text into ordered line entries. `KEY=value` lines become `pair`s
 * (with `export ` and quoting captured); `#…` and any non-pair lines become
 * `comment`s (kept verbatim); empty lines become `blank`s. A trailing newline
 * surfaces as a final `blank` entry, so `serializeEnv(parseEnvFile(t))` ≈ `t`.
 */
export const parseEnvFile = (text: string): EnvEntry[] => {
  const entries: EnvEntry[] = [];
  for (const raw of text.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      entries.push({ kind: 'blank', key: '', value: '', raw });
      continue;
    }
    if (trimmed.startsWith('#')) {
      entries.push({ kind: 'comment', key: '', value: '', raw });
      continue;
    }
    const exported = trimmed.startsWith('export ');
    const body = exported ? trimmed.slice('export '.length).trim() : trimmed;
    const eq = body.indexOf('=');
    if (eq === -1) {
      // Not a KEY=VALUE line — keep it verbatim rather than dropping it.
      entries.push({ kind: 'comment', key: '', value: '', raw });
      continue;
    }
    const key = body.slice(0, eq).trim();
    if (!key) {
      entries.push({ kind: 'comment', key: '', value: '', raw });
      continue;
    }
    let value = body.slice(eq + 1).trim();
    let quote: EnvEntry['quote'] = '';
    if (isWrapped(value, '"')) {
      quote = '"';
      value = value.slice(1, -1);
    } else if (isWrapped(value, "'")) {
      quote = "'";
      value = value.slice(1, -1);
    }
    entries.push({ kind: 'pair', key, value, raw, exported, quote });
  }
  return entries;
};

const emitPair = (e: EnvEntry): string => {
  const q = e.quote ?? '';
  return `${e.exported ? 'export ' : ''}${e.key}=${q}${e.value}${q}`;
};

/** Serialize line entries back to dotenv text (comments/blanks re-emitted as-is). */
export const serializeEnv = (entries: EnvEntry[]): string =>
  entries.map((e) => (e.kind === 'pair' ? emitPair(e) : e.raw)).join('\n');

/** Plain key→value map (last value wins), matching dotenv lookup semantics. */
export const parseEnvText = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const e of parseEnvFile(text)) {
    if (e.kind === 'pair') out[e.key] = e.value;
  }
  return out;
};

/**
 * Insert or update a single `KEY=value` in env text, preserving every other line
 * (and an existing pair's `export`/quoting). Newlines in the value are flattened
 * to spaces so one line stays one line. Pure string→string.
 */
export const upsertEnvVar = (text: string, key: string, value: string): string => {
  const clean = value.replace(/[\r\n]+/g, ' ').trim();
  const entries = parseEnvFile(text);
  const idx = entries.findIndex((e) => e.kind === 'pair' && e.key === key);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], value: clean };
    return serializeEnv(entries);
  }
  // Append after the last real content (drop a trailing-newline blank first so we
  // don't leave a gap), then let serialize re-add the final newline.
  while (entries.length && entries[entries.length - 1].kind === 'blank') entries.pop();
  entries.push({ kind: 'pair', key, value: clean, raw: `${key}=${clean}`, quote: '' });
  entries.push({ kind: 'blank', key: '', value: '', raw: '' });
  return serializeEnv(entries);
};

/**
 * Sort `pair` entries alphabetically by key. Each pair keeps the block of comment
 * lines immediately above it; blank separator lines are dropped (their position is
 * meaningless once order changes); comments trailing the final pair stay at the end.
 */
export const sortEnvEntries = (entries: EnvEntry[]): EnvEntry[] => {
  const blocks: { lead: EnvEntry[]; pair: EnvEntry }[] = [];
  let lead: EnvEntry[] = [];
  for (const e of entries) {
    if (e.kind === 'pair') {
      blocks.push({ lead, pair: e });
      lead = [];
    } else if (e.kind === 'comment') {
      lead.push(e);
    }
    // blank lines are intentionally dropped on sort
  }
  blocks.sort((a, b) => a.pair.key.localeCompare(b.pair.key));
  const out: EnvEntry[] = [];
  for (const b of blocks) out.push(...b.lead, b.pair);
  out.push(...lead); // trailing comments with no following pair
  return out;
};

/** Convenience: parse → sort → serialize. */
export const sortEnvText = (text: string): string => serializeEnv(sortEnvEntries(parseEnvFile(text)));

// ── Comparison ───────────────────────────────────────────────────────────────

export interface EnvSource {
  label: string;
  text: string;
}

export interface EnvDiffRow {
  key: string;
  /** label → value; `undefined` means the key is absent in that source. */
  values: Record<string, string | undefined>;
  /** labels missing this key entirely. */
  missingIn: string[];
  /** true when a value is missing in some source OR present values disagree. */
  differs: boolean;
}

export interface EnvDiff {
  labels: string[];
  rows: EnvDiffRow[];
}

/**
 * Compare N named env texts into a key×source matrix (rows sorted by key). A row
 * `differs` when the key is missing somewhere or the present values aren't all
 * equal — the signal for "this app is missing / has a stale value".
 */
export const diffEnvSets = (sources: EnvSource[]): EnvDiff => {
  const labels = sources.map((s) => s.label);
  const maps = sources.map((s) => parseEnvText(s.text));
  const keys = [...new Set(maps.flatMap((m) => Object.keys(m)))].sort((a, b) => a.localeCompare(b));
  const rows = keys.map((key) => {
    const values: Record<string, string | undefined> = {};
    const missingIn: string[] = [];
    const present: string[] = [];
    sources.forEach((s, i) => {
      if (Object.hasOwn(maps[i], key)) {
        values[s.label] = maps[i][key];
        present.push(maps[i][key]);
      } else {
        values[s.label] = undefined;
        missingIn.push(s.label);
      }
    });
    return { key, values, missingIn, differs: missingIn.length > 0 || new Set(present).size > 1 };
  });
  return { labels, rows };
};
