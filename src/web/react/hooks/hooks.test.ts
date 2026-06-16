import { describe, expect, it } from 'bun:test';
import { createLocalStorageViewStore, type ViewStorage } from './createLocalStorageViewStore';
import { crossInsertEdge, insertionIndexAcross, positionAtIndex } from './useCrossContainerDrag';
import { computeReorder, dropEdge, dropTargetIndex, reorderByIndex, slotShift } from './useDragReorder';
import { paginationRange } from './usePagination';
import { compareSortValues } from './useTableSort';

describe('paginationRange', () => {
  it('derives page count and start index', () => {
    expect(paginationRange(50, 1, 25)).toEqual({ page: 1, pageCount: 2, startIndex: 0 });
    expect(paginationRange(50, 2, 25)).toEqual({ page: 2, pageCount: 2, startIndex: 25 });
  });

  it('clamps the page into range', () => {
    expect(paginationRange(50, 9, 25).page).toBe(2);
    expect(paginationRange(50, 0, 25).page).toBe(1);
  });

  it('always reports at least one page, even when empty', () => {
    expect(paginationRange(0, 1, 25)).toEqual({ page: 1, pageCount: 1, startIndex: 0 });
  });
});

describe('compareSortValues', () => {
  it('orders numbers and strings ascending', () => {
    expect(compareSortValues(1, 2)).toBeLessThan(0);
    expect(compareSortValues('b', 'a')).toBeGreaterThan(0);
  });

  it('uses natural numeric ordering for numeric strings', () => {
    expect(compareSortValues('item2', 'item10')).toBeLessThan(0);
  });

  it('sorts empties last in both directions', () => {
    expect(compareSortValues(null, 5)).toBe(1);
    expect(compareSortValues('', 'a')).toBe(1);
    expect(compareSortValues(undefined, undefined)).toBe(0);
  });
});

describe('computeReorder', () => {
  it('moves an item after a target', () => {
    expect(computeReorder(['a', 'b', 'c'], 'a', 'c', false)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item before a target', () => {
    expect(computeReorder(['a', 'b', 'c'], 'c', 'a', true)).toEqual(['c', 'a', 'b']);
  });

  it('returns null when nothing changes', () => {
    expect(computeReorder(['a', 'b', 'c'], 'a', 'a', true)).toBeNull();
    expect(computeReorder(['a', 'b', 'c'], 'a', 'b', true)).toBeNull();
    expect(computeReorder(['a', 'b', 'c'], 'a', 'missing', true)).toBeNull();
  });
});

describe('reorderByIndex', () => {
  it('drops an item at a slot among the other items', () => {
    expect(reorderByIndex(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(reorderByIndex(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(reorderByIndex(['a', 'b', 'c'], 'b', 0)).toEqual(['b', 'a', 'c']);
  });

  it('clamps an out-of-range index to the end', () => {
    expect(reorderByIndex(['a', 'b', 'c'], 'a', 99)).toEqual(['b', 'c', 'a']);
    expect(reorderByIndex(['a', 'b', 'c'], 'c', -5)).toEqual(['c', 'a', 'b']);
  });

  it('returns null for a no-op (lands home) or a missing id', () => {
    expect(reorderByIndex(['a', 'b', 'c'], 'a', 0)).toBeNull(); // already first
    expect(reorderByIndex(['a', 'b', 'c'], 'b', 1)).toBeNull(); // back to its own slot
    expect(reorderByIndex(['a', 'b', 'c'], 'missing', 0)).toBeNull();
  });
});

describe('dropTargetIndex', () => {
  // A 3-row vertical list: rows at y 0–20, 20–40, 40–60 (centres 10/30/50).
  const rects = [
    { left: 0, top: 0, width: 100, height: 20 },
    { left: 0, top: 20, width: 100, height: 20 },
    { left: 0, top: 40, width: 100, height: 20 },
  ];

  it('lands at the end when the pointer is past the last other item', () => {
    expect(dropTargetIndex({ rects, fromIndex: 0, pointer: { x: 50, y: 55 } })).toBe(2);
  });

  it('lands at the front when dragging up past the first other item', () => {
    expect(dropTargetIndex({ rects, fromIndex: 1, pointer: { x: 50, y: 4 } })).toBe(0);
  });

  it('resolves a slot even when the pointer is way off to the side (sway)', () => {
    // x is far from the column but still inside the home-snap margin → still targets by y.
    expect(dropTargetIndex({ rects, fromIndex: 0, pointer: { x: 150, y: 55 } })).toBe(2);
  });

  it('snaps back home when swung clear of the list along the cross axis', () => {
    const container = { left: 0, top: 0, width: 100, height: 60 };
    expect(dropTargetIndex({ rects, fromIndex: 1, pointer: { x: 400, y: 30 }, container })).toBe(1);
  });

  it('never produces a no-target dead zone over the dragged item itself', () => {
    // Pointer sitting on the dragged row still resolves to a concrete neighbour slot.
    const t = dropTargetIndex({ rects, fromIndex: 1, pointer: { x: 50, y: 30 } });
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(2);
  });
});

describe('slotShift', () => {
  const rects = [
    { left: 0, top: 0, width: 100, height: 20 },
    { left: 0, top: 20, width: 100, height: 20 },
    { left: 0, top: 40, width: 100, height: 20 },
  ];

  it('slides the items between origin and target to open the gap', () => {
    // Drag row 1 (b) to the end (target slot 2): c slides up into b's home, the
    // gap opens where c was; a and the dragged row do not move.
    expect(slotShift(0, 1, 2, rects)).toEqual({ x: 0, y: 0 });
    expect(slotShift(2, 1, 2, rects)).toEqual({ x: 0, y: -20 });
    expect(slotShift(1, 1, 2, rects)).toEqual({ x: 0, y: 0 }); // the dragged item never shifts
  });

  it('does not shift anything when the drop lands home', () => {
    expect(slotShift(0, 1, 1, rects)).toEqual({ x: 0, y: 0 });
    expect(slotShift(2, 1, 1, rects)).toEqual({ x: 0, y: 0 });
  });
});

describe('dropEdge', () => {
  it('marks exactly one item edge for the indicator', () => {
    // total 3, drag index 1, target end (2): trailing edge of the last other item (c, index 2).
    expect(dropEdge(2, 1, 2, 3)).toEqual({ before: false, after: true });
    expect(dropEdge(0, 1, 2, 3)).toEqual({ before: false, after: false });
  });

  it('always shows an indicator, even when the drop lands home', () => {
    // target 1 == fromIndex 1: the item after home (c) gets a leading-edge line.
    expect(dropEdge(2, 1, 1, 3)).toEqual({ before: true, after: false });
  });

  it('marks the leading edge of the item after the gap for a front drop', () => {
    expect(dropEdge(0, 1, 0, 3)).toEqual({ before: true, after: false });
  });
});

describe('insertionIndexAcross', () => {
  // Three cards stacked vertically: y 0–20, 20–40, 40–60 (centres 10/30/50).
  const rects = [
    { left: 0, top: 0, width: 100, height: 20 },
    { left: 0, top: 20, width: 100, height: 20 },
    { left: 0, top: 40, width: 100, height: 20 },
  ];

  it('drops into a foreign column (dragged item absent) at any slot 0..n', () => {
    expect(insertionIndexAcross({ rects, excludeIndex: -1, pointer: { x: 50, y: 4 } })).toBe(0);
    expect(insertionIndexAcross({ rects, excludeIndex: -1, pointer: { x: 50, y: 25 } })).toBe(1); // upper half of card 1
    expect(insertionIndexAcross({ rects, excludeIndex: -1, pointer: { x: 50, y: 100 } })).toBe(3); // past the end
  });

  it('drops into an empty column at slot 0', () => {
    expect(insertionIndexAcross({ rects: [], excludeIndex: -1, pointer: { x: 50, y: 50 } })).toBe(0);
  });

  it('reorders within the home column, excluding the dragged card (slots 0..n-1)', () => {
    // Dragging card index 0; only two candidates remain → max index is 2.
    expect(insertionIndexAcross({ rects, excludeIndex: 0, pointer: { x: 50, y: 100 } })).toBe(2);
    expect(insertionIndexAcross({ rects, excludeIndex: 0, pointer: { x: 50, y: 25 } })).toBe(0);
  });

  it('targets by 2-D centre distance so off-axis sway still resolves a slot', () => {
    expect(insertionIndexAcross({ rects, excludeIndex: -1, pointer: { x: 400, y: 55 } })).toBe(3);
  });
});

describe('crossInsertEdge', () => {
  it('marks the leading edge of the item at the slot for a mid/front drop', () => {
    expect(crossInsertEdge(['a', 'b', 'c'], -1, 0)).toEqual({ beforeId: 'a', afterId: null });
    expect(crossInsertEdge(['a', 'b', 'c'], -1, 1)).toEqual({ beforeId: 'b', afterId: null });
  });

  it('marks the trailing edge of the last candidate for an end drop', () => {
    expect(crossInsertEdge(['a', 'b', 'c'], -1, 3)).toEqual({ beforeId: null, afterId: 'c' });
  });

  it('skips the dragged item so the line never attaches to it', () => {
    // Dragging 'b' (index 1); candidates are [a, c]; slot 1 → before 'c'.
    expect(crossInsertEdge(['a', 'b', 'c'], 1, 1)).toEqual({ beforeId: 'c', afterId: null });
    expect(crossInsertEdge(['a', 'b', 'c'], 1, 2)).toEqual({ beforeId: null, afterId: 'c' });
  });

  it('marks nothing for an empty column', () => {
    expect(crossInsertEdge([], -1, 0)).toEqual({ beforeId: null, afterId: null });
  });
});

describe('positionAtIndex', () => {
  it('appends past the end and prepends before the front', () => {
    expect(positionAtIndex([1, 2, 3], 3)).toBe(4);
    expect(positionAtIndex([1, 2, 3], 0)).toBe(0);
  });

  it('midpoints between the new neighbours for an interior slot', () => {
    expect(positionAtIndex([1, 2, 3], 1)).toBe(1.5);
    expect(positionAtIndex([1, 4], 1)).toBe(2.5);
  });

  it('starts an empty column at 1', () => {
    expect(positionAtIndex([], 0)).toBe(1);
  });
});

describe('createLocalStorageViewStore', () => {
  const fakeStorage = (): ViewStorage => {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  };

  it('round-trips values and persists to storage', () => {
    const storage = fakeStorage();
    const store = createLocalStorageViewStore({ storage });
    expect(store.get('tab')).toBeUndefined();
    store.set('tab', 'overview');
    expect(store.get<string>('tab')).toBe('overview');
    // A fresh store over the same storage rehydrates the value.
    expect(createLocalStorageViewStore({ storage }).get<string>('tab')).toBe('overview');
  });

  it('notifies subscribers on write and stops after unsubscribe', () => {
    const store = createLocalStorageViewStore({ storage: null });
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.set('a', 1);
    expect(calls).toBe(1);
    unsub();
    store.set('a', 2);
    expect(calls).toBe(1);
  });

  it('works with no storage backend (in-memory)', () => {
    const store = createLocalStorageViewStore({ storage: null });
    store.set('x', 42);
    expect(store.get<number>('x')).toBe(42);
  });
});
