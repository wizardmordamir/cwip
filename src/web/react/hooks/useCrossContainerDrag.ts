import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';
import { type DragRect, reorderByIndex } from './useDragReorder';

/**
 * Cross-container pointer drag — the multi-list sibling of `useDragReorder`.
 *
 * Where `useDragReorder` reorders within ONE list, this drives a kanban-style set
 * of containers (e.g. board columns) where an item can be reordered within its
 * column AND moved to a different column, landing at a precise slot. It shares the
 * same pure geometry model (nearest-centre targeting, edge-to-edge slots, no dead
 * zones) and the same "lifted, translucent dragged item + a single `DropIndicator`
 * line" affordance, so drag feels identical to every single-list site.
 *
 * Because a column typically scrolls (`overflow-y: auto`, which clips BOTH axes),
 * the dragged item is floated with `position: fixed` so it can travel over the
 * other columns without being clipped — the one deliberate difference from the
 * single-list engine, which keeps the item in flow.
 */

/** A drop committed by the engine: move `id` out of `from` into `to` at `index`
 *  (the slot among `to`'s items, excluding `id` itself). For a same-column move
 *  the engine only fires this when the order actually changes. */
export interface CrossContainerMove {
  id: string;
  from: string;
  to: string;
  index: number;
}

/**
 * Where the dragged item lands among a container's items for a pointer position —
 * an insertion index in `[0, count]`, where `count` is the number of candidate
 * items (every item, minus the dragged one when it lives in THIS container).
 *
 * Unlike `dropTargetIndex` (single-list, always excludes a home slot and clamps to
 * an existing neighbour), this generalises to a container the dragged item is NOT
 * in: every item is a candidate and the index can be the very end (`count`). An
 * empty container resolves to `0` so a card can be dropped into a blank column.
 * Pure + testable.
 */
export const insertionIndexAcross = ({
  rects,
  excludeIndex,
  pointer,
  axis = 'y',
}: {
  /** Item boxes in container order; may include the dragged item's box. */
  rects: (DragRect | undefined)[];
  /** Index of the dragged item within `rects` if it lives here, else `-1`. */
  excludeIndex: number;
  pointer: { x: number; y: number };
  axis?: 'x' | 'y';
}): number => {
  const n = rects.length;
  const count = excludeIndex >= 0 && excludeIndex < n ? n - 1 : n;
  let bestK = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  let before = false;
  for (let k = 0; k < n; k++) {
    if (k === excludeIndex) continue;
    const r = rects[k];
    if (!r) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = (pointer.x - cx) ** 2 + (pointer.y - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestK = k;
      before = axis === 'x' ? pointer.x < cx : pointer.y < cy;
    }
  }
  if (bestK < 0) return 0; // empty container → drop into the first slot
  // bestK is an index into `rects`; convert to its index among the candidates.
  const kf = excludeIndex >= 0 && bestK > excludeIndex ? bestK - 1 : bestK;
  const t = before ? kf : kf + 1;
  return Math.max(0, Math.min(t, count));
};

/**
 * Which single item borders the open gap at `targetIndex`, and on which edge — so
 * consumers render exactly one `DropIndicator`. `excludeIndex` is the dragged
 * item's index within `ids` when it lives in this container (else `-1`); it is
 * skipped so the line never attaches to the item being dragged. Returns the ids to
 * mark (or `null`), never both set. Pure + testable.
 */
export const crossInsertEdge = (
  ids: string[],
  excludeIndex: number,
  targetIndex: number,
): { beforeId: string | null; afterId: string | null } => {
  const candidates = ids.filter((_, i) => i !== excludeIndex);
  if (candidates.length === 0) return { beforeId: null, afterId: null };
  if (targetIndex >= candidates.length) return { beforeId: null, afterId: candidates[candidates.length - 1] };
  return { beforeId: candidates[Math.max(0, targetIndex)], afterId: null };
};

/**
 * The fractional sort key to drop an item at `index` within a column whose
 * remaining items have the given ascending `positions`. Mirrors the midpoint
 * insert both kanban boards hand-rolled: before the first → one less than it,
 * after the last → one more, otherwise the midpoint of its new neighbours. An
 * empty column starts at `1`. Pure + testable.
 */
export const positionAtIndex = (positions: number[], index: number): number => {
  const n = positions.length;
  if (n === 0) return 1;
  if (index <= 0) return positions[0] - 1;
  if (index >= n) return positions[n - 1] + 1;
  return (positions[index - 1] + positions[index]) / 2;
};

const rectOf = (el: HTMLElement): DragRect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** Which container the pointer is over: the first whose box contains it, else the
 *  nearest by centre distance (so a drop always resolves somewhere sensible). */
const containerAt = (containers: Map<string, ContainerMeta>, pointer: { x: number; y: number }): string | null => {
  let nearest: string | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const [id, c] of containers) {
    const { left, top, width, height } = c.rect;
    if (pointer.x >= left && pointer.x <= left + width && pointer.y >= top && pointer.y <= top + height) return id;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const d = (pointer.x - cx) ** 2 + (pointer.y - cy) ** 2;
    if (d < nearestDist) {
      nearestDist = d;
      nearest = id;
    }
  }
  return nearest;
};

interface ContainerMeta {
  rect: DragRect;
  ids: string[];
  rects: (DragRect | undefined)[];
}

interface DragMeta {
  containers: Map<string, ContainerMeta>;
  fromContainerId: string;
  fromId: string;
  fromRect: DragRect | null;
}

export interface UseCrossContainerDragOptions {
  /** Ordered item ids per container, keyed by container id. */
  containers: Record<string, string[]>;
  /** Committed on drop. For a same-container move the engine only fires this when
   *  the order actually changes; a cross-container move always fires. */
  onMove: (move: CrossContainerMove) => void;
  /** Pixels the pointer must travel before a drag activates (taps still click).
   *  Default 6. */
  activationDistance?: number;
  /** Layout axis WITHIN a container — `'y'` (default) for vertical columns of
   *  cards, `'x'` for horizontal rows. */
  axis?: 'x' | 'y';
}

/**
 * Spread `getContainerProps(containerId)` on each column wrapper, `getItemProps
 * (containerId, id)` on each item, and `getHandleProps(containerId, id)` on the
 * grab affordance (often the whole card). `activeContainerId` is the column the
 * pointer currently targets — render a column highlight / empty-column drop line
 * off it. `draggingId` is the lifted item.
 */
export const useCrossContainerDrag = ({
  containers,
  onMove,
  activationDistance = 6,
  axis = 'y',
}: UseCrossContainerDragOptions) => {
  const containerEls = useRef(new Map<string, HTMLElement>());
  const grab = useRef({ x: 0, y: 0 });
  const pending = useRef<{ containerId: string; id: string } | null>(null);
  const dragged = useRef(false);
  const meta = useRef<DragMeta | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [active, setActive] = useState<{ containerId: string; index: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const capture = (fromContainerId: string, fromId: string): DragMeta => {
    const map = new Map<string, ContainerMeta>();
    let fromRect: DragRect | null = null;
    for (const [cid, el] of containerEls.current) {
      const itemRects = new Map<string, DragRect>();
      for (const it of Array.from(el.querySelectorAll<HTMLElement>('[data-drag-id]'))) {
        const id = it.dataset.dragId ?? '';
        const box = rectOf(it);
        itemRects.set(id, box);
        if (cid === fromContainerId && id === fromId) fromRect = box;
      }
      const ids = (containers[cid] ?? []).slice();
      map.set(cid, { rect: rectOf(el), ids, rects: ids.map((id) => itemRects.get(id)) });
    }
    return { containers: map, fromContainerId, fromId, fromRect };
  };

  const onPointerDown = (e: PointerEvent, containerId: string, id: string) => {
    if (e.button !== 0) return;
    grab.current = { x: e.clientX, y: e.clientY };
    pending.current = { containerId, id };
    dragged.current = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!draggingId && pending.current) {
      const dx = e.clientX - grab.current.x;
      const dy = e.clientY - grab.current.y;
      if (Math.hypot(dx, dy) < activationDistance) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      meta.current = capture(pending.current.containerId, pending.current.id);
      setDraggingId(pending.current.id);
      dragged.current = true;
    }
    const m = meta.current;
    if (!m) return;
    setOffset({ x: e.clientX - grab.current.x, y: e.clientY - grab.current.y });
    const pointer = { x: e.clientX, y: e.clientY };
    const containerId = containerAt(m.containers, pointer);
    if (!containerId) return;
    const c = m.containers.get(containerId);
    if (!c) return;
    const excludeIndex = containerId === m.fromContainerId ? c.ids.indexOf(m.fromId) : -1;
    setActive({ containerId, index: insertionIndexAcross({ rects: c.rects, excludeIndex, pointer, axis }) });
  };

  const finish = () => {
    const m = meta.current;
    const a = active;
    const wasDrag = dragged.current;
    pending.current = null;
    meta.current = null;
    setDraggingId(null);
    setActive(null);
    setOffset({ x: 0, y: 0 });
    if (m && a) {
      const { fromContainerId: from, fromId: id } = m;
      const to = a.containerId;
      if (from === to) {
        const src = m.containers.get(from);
        // Only a real reorder fires (a drop back into the same slot is a no-op).
        if (src && reorderByIndex(src.ids, id, a.index)) onMove({ id, from, to, index: a.index });
      } else {
        onMove({ id, from, to, index: a.index });
      }
    }
    if (wasDrag) setTimeout(() => (dragged.current = false), 0);
  };

  const getContainerProps = (containerId: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) containerEls.current.set(containerId, el);
      else containerEls.current.delete(containerId);
    },
    'data-drag-container': containerId,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  });

  const getItemProps = (containerId: string, id: string) => {
    const isDragging = draggingId === id;
    const m = meta.current;
    const isActiveContainer = active != null && active.containerId === containerId;
    let edge: { beforeId: string | null; afterId: string | null } | null = null;
    if (isActiveContainer && m) {
      const c = m.containers.get(containerId);
      if (c) {
        const excludeIndex = containerId === m.fromContainerId ? c.ids.indexOf(m.fromId) : -1;
        edge = crossInsertEdge(c.ids, excludeIndex, active.index);
      }
    }
    const insertBefore = !isDragging && edge?.beforeId === id;
    const insertAfter = !isDragging && edge?.afterId === id;

    let style: CSSProperties;
    if (isDragging && m?.fromRect) {
      // Float free with fixed positioning so the card clears every column's
      // overflow as it travels; pinned to its captured viewport box + the live
      // pointer delta. Translucent + lifted so the drop line shows through it.
      style = {
        position: 'fixed',
        left: m.fromRect.left,
        top: m.fromRect.top,
        width: m.fromRect.width,
        transform: `translate(${offset.x}px, ${offset.y}px) scale(1.02)`,
        zIndex: 1000,
        opacity: 0.85,
        boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.28)',
        cursor: 'grabbing',
        pointerEvents: 'none',
        transition: 'none',
      };
    } else {
      style = { position: 'relative' };
    }

    return {
      'data-drag-id': id,
      style,
      isDragging,
      insertBefore,
      insertAfter,
      onClickCapture: (e: React.MouseEvent) => {
        if (dragged.current) {
          e.preventDefault();
          e.stopPropagation();
          dragged.current = false;
        }
      },
    };
  };

  const getHandleProps = (containerId: string, id: string) => ({
    style: {
      cursor: draggingId === id ? 'grabbing' : 'grab',
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    } as CSSProperties,
    onPointerDown: (e: PointerEvent) => onPointerDown(e, containerId, id),
  });

  return {
    getContainerProps,
    getItemProps,
    getHandleProps,
    draggingId,
    /** The column the pointer is currently targeting (for a highlight / empty-column line). */
    activeContainerId: active?.containerId ?? null,
    /** The insertion slot within the active container (0 when it is empty). */
    activeIndex: active?.index ?? null,
  };
};
