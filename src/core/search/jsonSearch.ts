import { buildSnippet, type SnippetOptions } from './snippet';
import { valueToText } from './value';

type Obj = Record<string, unknown>;

// Accept either a parsed object or a raw JSON string (a stored JSON column); a
// non-object / unparseable value yields {} so callers needn't guard.
const toObject = (data: Obj | string): Obj => {
  if (typeof data !== 'string') return data ?? {};
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Obj) : {};
  } catch {
    return {};
  }
};

// The field values to consider, dropping any `exclude` keys (e.g. secret columns).
const includedValues = (data: Obj, exclude?: Iterable<string>): unknown[] => {
  const skip = exclude ? new Set(exclude) : undefined;
  const out: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (skip?.has(k)) continue;
    out.push(v);
  }
  return out;
};

/**
 * The first non-empty value (as text) across a record's fields, skipping `exclude`
 * keys — a reasonable human label for a row that has no designated title column.
 * Returns `''` when every (included) field is empty.
 */
export const firstNonEmptyValue = (data: Obj | string, exclude?: Iterable<string>): string => {
  for (const v of includedValues(toObject(data), exclude)) {
    const text = valueToText(v);
    if (text) return text;
  }
  return '';
};

/**
 * Does any field value contain `query` (case-insensitive), ignoring `exclude` keys?
 * The load-bearing check for secret safety: pass the secret column keys as `exclude`
 * and a row that the SQL `LIKE` matched only via a secret is correctly rejected, so
 * a secret can neither trigger a search hit nor leak into one.
 */
export const jsonValuesMatch = (data: Obj | string, query: string, exclude?: Iterable<string>): boolean => {
  const needle = query.toLowerCase();
  return includedValues(toObject(data), exclude).some((v) => valueToText(v).toLowerCase().includes(needle));
};

export interface JsonSnippetOptions extends SnippetOptions {
  /** Keys to skip (e.g. secret columns) — never matched against nor excerpted. */
  exclude?: Iterable<string>;
}

/**
 * A snippet around the first field value that contains `query` — surfaced when the
 * match is in a column other than the row's label. Skips `exclude` keys, so a
 * stripped secret can't be excerpted. Returns `undefined` when nothing matches.
 */
export const firstMatchSnippet = (data: Obj | string, query: string, opts?: JsonSnippetOptions): string | undefined => {
  const needle = query.toLowerCase();
  for (const v of includedValues(toObject(data), opts?.exclude)) {
    const text = valueToText(v);
    if (text.toLowerCase().includes(needle)) return buildSnippet(text, query, opts);
  }
  return undefined;
};
