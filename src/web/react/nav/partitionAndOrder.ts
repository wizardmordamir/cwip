import type { NavEntry } from './types';

/**
 * A stable rank for `id` within `order`: its index, or +∞ when unlisted so it
 * sorts to the end. Pair with a stable sort to keep the natural order of any items
 * the saved order doesn't mention. This is the `indexOf`/`MAX_SAFE_INTEGER` rank
 * that was hand-copied across NavList, SideNav, HubGrid, and SettingsPage.
 */
export const orderRank = (order: string[], id: string): number => {
  const i = order.indexOf(id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

/**
 * Split eligible entries into the visible list (sorted by the user's saved
 * `order`, keyed by `entry.id`) and the hidden list (kept in natural order, to
 * feed a "restore hidden" menu). Pure + testable. `entry.hidden` is resolved
 * app-side, so this works regardless of how the app keys its hidden set.
 */
export const partitionAndOrder = (
  entries: NavEntry[],
  order: string[],
): { visible: NavEntry[]; hidden: NavEntry[] } => {
  const visible: NavEntry[] = [];
  const hidden: NavEntry[] = [];
  for (const e of entries) (e.hidden ? hidden : visible).push(e);
  visible.sort((a, b) => orderRank(order, a.id) - orderRank(order, b.id));
  return { visible, hidden };
};
