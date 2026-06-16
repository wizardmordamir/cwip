export interface SnippetOptions {
  /** Characters of context to keep on each side of the match (default 40). */
  context?: number;
  /** Marker inserted where an end was trimmed (default "…"). */
  ellipsis?: string;
}

/**
 * A short excerpt of `text` centered on the first case-insensitive occurrence of
 * `query`, with an ellipsis wherever an end was trimmed — so a search result can
 * show *why* it matched, not just its title. Returns `undefined` when the query
 * isn't present (so callers can `?? otherSnippet`). Pure + testable.
 */
export const buildSnippet = (text: string, query: string, opts: SnippetOptions = {}): string | undefined => {
  const { context = 40, ellipsis = '…' } = opts;
  const haystack = text ?? '';
  const idx = haystack.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return undefined;
  const start = Math.max(0, idx - context);
  const end = Math.min(haystack.length, idx + query.length + context);
  return `${start > 0 ? ellipsis : ''}${haystack.slice(start, end)}${end < haystack.length ? ellipsis : ''}`;
};

/**
 * {@link buildSnippet}, but only when the match isn't already visible in `label` —
 * so a result whose title already contains the query doesn't repeat it as a
 * redundant snippet. Returns `undefined` when the label already shows the match (or
 * the query isn't found at all).
 */
export const snippetForLabel = (
  text: string,
  label: string,
  query: string,
  opts?: SnippetOptions,
): string | undefined =>
  label.toLowerCase().includes(query.toLowerCase()) ? undefined : buildSnippet(text, query, opts);
