import { useCallback, useMemo } from 'react';

/**
 * Controlled, persistence-agnostic "hide some items, bring them back later"
 * helper — the state side of the hide/restore pattern (the UI side is the
 * {@link DismissButton} "✕" + the {@link AddItemsMenu} "+ Add…" popover).
 *
 * It operates over a **fixed catalog** (`items`) with a controlled **deny-list**
 * (`hidden` ids): the consumer owns persistence (Redux/server preferences, a
 * per-machine config file, localStorage, …) by handling `onHiddenChange`. For an
 * allow-list model (e.g. an ordered "enabled" list), keep that bespoke — this is
 * for the common "catalog minus hidden" case (hub tiles, template entries, …).
 */
export interface UseDismissibleItemsOptions<T> {
  /** The full catalog of items, in their natural display order. */
  items: T[];
  /** Stable id for an item (used for the hidden set + React keys). */
  itemKey: (item: T) => string;
  /** Controlled set of hidden ids. */
  hidden: string[];
  /** Called with the next hidden set whenever an item is hidden/restored. */
  onHiddenChange: (next: string[]) => void;
}

export interface DismissibleItems<T> {
  /** Catalog items not currently hidden (display order preserved). */
  visible: T[];
  /** Catalog items currently hidden (the "bring back" list). */
  hiddenItems: T[];
  /** Whether an id is in the hidden set. */
  isHidden: (id: string) => boolean;
  /** Add an id to the hidden set (idempotent). */
  hide: (id: string) => void;
  /** Remove an id from the hidden set. */
  restore: (id: string) => void;
  /** Clear the hidden set entirely. */
  restoreAll: () => void;
}

/**
 * Split a catalog into `{ visible, hiddenItems }` by a hidden-id set. Pure — the
 * testable core of {@link useDismissibleItems}. An item whose key is absent from
 * `items` but present in `hidden` is simply ignored (stale ids don't break).
 */
export function partitionDismissible<T>(
  items: T[],
  itemKey: (item: T) => string,
  hidden: Iterable<string>,
): { visible: T[]; hiddenItems: T[] } {
  const hiddenSet = new Set(hidden);
  const visible: T[] = [];
  const hiddenItems: T[] = [];
  for (const item of items) {
    (hiddenSet.has(itemKey(item)) ? hiddenItems : visible).push(item);
  }
  return { visible, hiddenItems };
}

export function useDismissibleItems<T>({
  items,
  itemKey,
  hidden,
  onHiddenChange,
}: UseDismissibleItemsOptions<T>): DismissibleItems<T> {
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const { visible, hiddenItems } = useMemo(
    () => partitionDismissible(items, itemKey, hiddenSet),
    [items, itemKey, hiddenSet],
  );

  const isHidden = useCallback((id: string) => hiddenSet.has(id), [hiddenSet]);
  const hide = useCallback(
    (id: string) => {
      if (!hiddenSet.has(id)) onHiddenChange([...hidden, id]);
    },
    [hidden, hiddenSet, onHiddenChange],
  );
  const restore = useCallback((id: string) => onHiddenChange(hidden.filter((h) => h !== id)), [hidden, onHiddenChange]);
  const restoreAll = useCallback(() => onHiddenChange([]), [onHiddenChange]);

  return { visible, hiddenItems, isHidden, hide, restore, restoreAll };
}
