import type { NavSearchItem } from './types';

/** A group of search results — `groupLabel` is the owning hub (omit = top-level). */
export interface NavSearchGroup {
  groupLabel?: string;
  items: NavSearchItem[];
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match quality (lower is better), or `null` for no match:
 * 0 label starts with the query · 1 query at a word boundary in the label ·
 * 2 substring in the label · 3 only matches the hub label or a keyword.
 */
const scoreMatch = (item: NavSearchItem, q: string): number | null => {
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 0;
  if (new RegExp(`\\b${escapeRegExp(q)}`).test(label)) return 1;
  if (label.includes(q)) return 2;
  const extra = [item.groupLabel, ...(item.keywords ?? [])]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase());
  if (extra.some((h) => h.includes(q))) return 3;
  return null;
};

/**
 * Filter + rank + group a search catalogue by `query`. Case-insensitive; matches
 * the label, the owning-hub label, and keywords. Items are ordered by match
 * quality (then catalogue order); groups are ordered top-level first, then hubs in
 * the order they first appear in the catalogue. An empty query returns `[]`.
 * Pure + testable — the one genuinely new bit of logic in the nav toolkit.
 */
export const filterNavSearch = (items: NavSearchItem[], query: string): NavSearchGroup[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched: { item: NavSearchItem; i: number; score: number }[] = [];
  items.forEach((item, i) => {
    const score = scoreMatch(item, q);
    if (score !== null) matched.push({ item, i, score });
  });

  // Remember each group's first catalogue appearance for stable group ordering.
  const firstSeen = new Map<string | undefined, number>();
  for (const { item, i } of matched) {
    if (!firstSeen.has(item.groupLabel)) firstSeen.set(item.groupLabel, i);
  }

  // Bucket items (already in best-match order) by group.
  const buckets = new Map<string | undefined, NavSearchItem[]>();
  for (const { item } of [...matched].sort((a, b) => a.score - b.score || a.i - b.i)) {
    const bucket = buckets.get(item.groupLabel);
    if (bucket) bucket.push(item);
    else buckets.set(item.groupLabel, [item]);
  }

  // Order hubs by first appearance; the top-level (undefined) group always leads.
  // (Don't sort `undefined` as an array element — Array.sort hoists it to the end
  // without consulting the comparator.)
  const hubKeys = [...buckets.keys()]
    .filter((k): k is string => k !== undefined)
    .sort((a, b) => (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0));
  const orderedKeys: (string | undefined)[] = buckets.has(undefined) ? [undefined, ...hubKeys] : hubKeys;
  return orderedKeys.map((groupLabel) => ({ groupLabel, items: buckets.get(groupLabel) ?? [] }));
};
