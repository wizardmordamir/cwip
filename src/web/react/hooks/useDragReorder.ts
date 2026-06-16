import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';

/**
 * Pure reorder: move `fromId` to land before/after `toId` within `ids`.
 * Returns the next order, or `null` when nothing would change. Kept for callers
 * that still think in terms of a hovered neighbour; `useDragReorder` itself now
 * drives off an insertion index (`reorderByIndex`).
 */
export const computeReorder = (ids: string[], fromId: string, toId: string, before: boolean): string[] | null => {
  if (fromId === toId) return null;
  const next = ids.filter((id) => id !== fromId);
  let toIdx = next.indexOf(toId);
  if (toIdx < 0) return null;
  if (!before) toIdx += 1;
  next.splice(toIdx, 0, fromId);
  return next.join('|') === ids.join('|') ? null : next;
};

/**
 * Pure reorder by destination slot: drop `fromId` at `index` within the list of
 * *other* items (i.e. the index it should occupy once itself is removed). This is
 * the model the drag engine works in — every pointer position maps to exactly one
 * slot, so there is never a "no drop target" dead zone. Returns the next order, or
 * `null` when the move is a no-op (lands back where it started / id missing).
 */
export const reorderByIndex = (ids: string[], fromId: string, index: number): string[] | null => {
  if (ids.indexOf(fromId) < 0) return null;
  const filtered = ids.filter((id) => id !== fromId);
  const at = Math.max(0, Math.min(index, filtered.length));
  filtered.splice(at, 0, fromId);
  return filtered.join('|') === ids.join('|') ? null : filtered;
};

/** A measured item box in viewport coordinates. */
export interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const rectOf = (el: HTMLElement): DragRect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/**
 * Where, in the list of *other* items, the dragged item (`fromIndex`) would land
 * for a given pointer position — an insertion index in `[0, n-1]`. Pure + testable.
 *
 * The big UX win over "nearest hovered item, before/after its centre" lives here:
 *  - The dragged item is excluded, so hovering over its own (translucent) box never
 *    produces a dead zone — there is always a concrete neighbour to land beside.
 *  - Every pointer position resolves to a slot (nearest centre → side of centre),
 *    so the drop regions are effectively edge-to-edge instead of a tight band.
 *  - Targeting is by 2-D centre distance, so for a vertical list the pointer can
 *    sway well left/right of the column and still pick the right row (and a wrapping
 *    grid still resolves rows correctly).
 *  - Carrying the item clear of the list along the *cross* axis (beyond
 *    `homeSnapMargin`) snaps the target back home, a clear "never mind" gesture
 *    that still leaves generous in-column sway room.
 */
export const dropTargetIndex = ({
  rects,
  fromIndex,
  pointer,
  axis = 'y',
  container,
  homeSnapMargin = 64,
}: {
  rects: (DragRect | undefined)[];
  fromIndex: number;
  pointer: { x: number; y: number };
  axis?: 'x' | 'y';
  container?: DragRect | null;
  homeSnapMargin?: number;
}): number => {
  const n = rects.length;
  if (n < 2 || fromIndex < 0) return Math.max(0, fromIndex);
  // Swung clear of the list sideways (cross axis) → return home. In-axis travel
  // (above the first / below the last item) stays a real front/end drop.
  if (container) {
    if (axis === 'y') {
      if (pointer.x < container.left - homeSnapMargin || pointer.x > container.left + container.width + homeSnapMargin)
        return fromIndex;
    } else if (
      pointer.y < container.top - homeSnapMargin ||
      pointer.y > container.top + container.height + homeSnapMargin
    ) {
      return fromIndex;
    }
  }
  let bestK = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  let before = false;
  for (let k = 0; k < n; k++) {
    if (k === fromIndex) continue;
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
  if (bestK < 0) return fromIndex;
  const kf = bestK < fromIndex ? bestK : bestK - 1; // its index among the *other* items
  const t = before ? kf : kf + 1;
  return Math.max(0, Math.min(t, n - 1));
};

/**
 * The translate (in px) to apply to the non-dragged item at `index` so the list
 * visually opens a gap at `targetIndex` and closes the dragged item's home slot —
 * i.e. every sibling slides to exactly where it will sit once dropped. Because the
 * preview positions equal the post-drop layout, releasing settles with no jump.
 * Pure + testable; returns the delta to the slot the item ends up occupying.
 */
export const slotShift = (
  index: number,
  fromIndex: number,
  targetIndex: number,
  rects: (DragRect | undefined)[],
): { x: number; y: number } => {
  if (index === fromIndex) return { x: 0, y: 0 };
  const oi = index < fromIndex ? index : index - 1; // its index among the other items
  const finalSlot = oi < targetIndex ? oi : oi + 1; // the layout slot it visually moves into
  const target = rects[finalSlot];
  const cur = rects[index];
  if (!target || !cur) return { x: 0, y: 0 };
  return { x: target.left - cur.left, y: target.top - cur.top };
};

/**
 * Which single item borders the open gap, and on which edge — so consumers render
 * exactly one `DropIndicator`, and it is *always* shown (including when the drop
 * would land back home). `total` is the full item count.
 */
export const dropEdge = (
  index: number,
  fromIndex: number,
  targetIndex: number,
  total: number,
): { before: boolean; after: boolean } => {
  let markIndex: number;
  let markBefore: boolean;
  if (targetIndex <= total - 2) {
    // There is an item just after the gap — mark its leading edge.
    markIndex = targetIndex < fromIndex ? targetIndex : targetIndex + 1;
    markBefore = true;
  } else {
    // Gap is at the very end — mark the trailing edge of the last other item.
    const last = total - 2;
    markIndex = last < fromIndex ? last : last + 1;
    markBefore = false;
  }
  return { before: index === markIndex && markBefore, after: index === markIndex && !markBefore };
};

export interface UseDragReorderOptions {
  /** Current order of item ids. */
  ids: string[];
  /** Committed on drop, only when the order actually changed. */
  onReorder: (next: string[]) => void;
  /** Pixels the pointer must move before a drag activates (so taps/clicks still
   *  work on draggable links/buttons). Default 6. */
  activationDistance?: number;
  /** Layout axis the items flow along, used to decide before/after a target and
   *  which way "swung clear of the list" lies. 'y' (default) for vertical lists,
   *  'x' for rows / grids. */
  axis?: 'x' | 'y';
  /** How far (px) past the list's cross-axis edge the pointer may stray before the
   *  drop snaps back to the item's home slot. Larger = more sideways sway tolerated
   *  before it reads as "cancel". Default 64. */
  homeSnapMargin?: number;
}

interface DragMeta {
  ids: string[];
  rects: (DragRect | undefined)[];
  container: DragRect | null;
  fromIndex: number;
}

/**
 * A small, dependency-free pointer-based reorder. The real element follows the
 * cursor via a transform while its siblings slide open a gap at the exact spot it
 * will land — so the list previews its post-drop shape and the drop is unmistakable.
 * The reorder is committed on release. Works for vertical lists, horizontal rows,
 * and 2-D grids.
 *
 * Consumers spread `containerProps` on the wrapper, `getItemProps(id)` on each item
 * (it carries the `style` that floats the dragged item / shifts the rest, plus
 * `insertBefore`/`insertAfter` for a `DropIndicator`), and `getHandleProps(id)` on
 * the grab affordance.
 */
export const useDragReorder = ({
  ids,
  onReorder,
  activationDistance = 6,
  axis = 'y',
  homeSnapMargin = 64,
}: UseDragReorderOptions) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const grab = useRef({ x: 0, y: 0 });
  const pendingId = useRef<string | null>(null); // pressed but not yet past threshold
  const dragged = useRef(false); // a drag actually happened (suppress the click)
  const meta = useRef<DragMeta | null>(null); // geometry captured at activation

  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Destination slot among the *other* items, or null when not dragging.
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const itemEls = (): HTMLElement[] =>
    containerRef.current ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-drag-id]')) : [];

  // Snapshot every item's layout box (and the container's) BEFORE any drag
  // transforms are applied, so target detection and the gap math run against
  // stable geometry instead of feeding back on the live, shifting transforms.
  const captureGeometry = (fromId: string): DragMeta => {
    const map = new Map(itemEls().map((el) => [el.dataset.dragId ?? '', rectOf(el)]));
    const orderedIds = ids.slice();
    return {
      ids: orderedIds,
      rects: orderedIds.map((id) => map.get(id)),
      container: containerRef.current ? rectOf(containerRef.current) : null,
      fromIndex: orderedIds.indexOf(fromId),
    };
  };

  const onPointerDown = (e: PointerEvent, id: string) => {
    if (e.button !== 0) return; // primary button / touch only
    grab.current = { x: e.clientX, y: e.clientY };
    pendingId.current = id;
    dragged.current = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    // Activate the drag once the pointer has moved far enough.
    if (!draggingId && pendingId.current) {
      const dx = e.clientX - grab.current.x;
      const dy = e.clientY - grab.current.y;
      if (Math.hypot(dx, dy) < activationDistance) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      meta.current = captureGeometry(pendingId.current);
      setDraggingId(pendingId.current);
      dragged.current = true;
    }
    const m = meta.current;
    if (!m) return;
    setOffset({ x: e.clientX - grab.current.x, y: e.clientY - grab.current.y });
    setTargetIndex(
      dropTargetIndex({
        rects: m.rects,
        fromIndex: m.fromIndex,
        pointer: { x: e.clientX, y: e.clientY },
        axis,
        container: m.container,
        homeSnapMargin,
      }),
    );
  };

  const finish = () => {
    const m = meta.current;
    const from = m && m.fromIndex >= 0 ? m.ids[m.fromIndex] : null;
    const t = targetIndex;
    const wasDrag = dragged.current;
    pendingId.current = null;
    meta.current = null;
    setDraggingId(null);
    setTargetIndex(null);
    setOffset({ x: 0, y: 0 });
    if (m && from && t != null) {
      const next = reorderByIndex(m.ids, from, t);
      if (next) onReorder(next);
    }
    // Clear the suppress-click flag on the next macrotask. The synthetic click
    // after a real drag fires first and is swallowed by onClickCapture; but on
    // touch a drag often produces NO trailing click, so without this a stale
    // `dragged.current = true` would survive and eat the user's NEXT tap.
    if (wasDrag) setTimeout(() => (dragged.current = false), 0);
  };

  const containerProps = {
    ref: containerRef as React.Ref<any>,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    // Cancel the browser's NATIVE drag-and-drop for anything inside the
    // container. Items can be (or contain) natively-draggable elements — an
    // <a href>, an <img> — and dragging one starts a native drag that ghosts the
    // element and fires `pointercancel`, killing our pointer stream. `dragstart`
    // bubbles, so catching it here covers every descendant.
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };

  const getItemProps = (id: string) => {
    const isDragging = draggingId === id;
    const m = meta.current;
    const active = Boolean(draggingId) && m != null && targetIndex != null;
    const i = active && m ? m.ids.indexOf(id) : -1;
    const edge = active && m && i >= 0 ? dropEdge(i, m.fromIndex, targetIndex as number, m.ids.length) : null;
    // The item bordering the open gap is "over"; its gap edge shows the indicator.
    const insertBefore = !isDragging && Boolean(edge?.before);
    const insertAfter = !isDragging && Boolean(edge?.after);
    const isOver = insertBefore || insertAfter;

    let style: CSSProperties;
    if (isDragging) {
      style = {
        transform: `translate(${offset.x}px, ${offset.y}px) scale(1.02)`,
        zIndex: 50,
        position: 'relative',
        transition: 'none',
        // The dragged item floats directly over the drop line (which renders on
        // the item bordering the gap). Keep it translucent + visibly lifted so the
        // line shows through it — and so this "picked up" look is consistent
        // everywhere instead of being hand-rolled per consumer.
        opacity: 0.6,
        boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.28)',
        cursor: 'grabbing',
      };
    } else if (active && m && i >= 0) {
      // Slide this sibling to the exact slot it will occupy once dropped, opening
      // the gap the dragged item will fill.
      const shift = slotShift(i, m.fromIndex, targetIndex as number, m.rects);
      style = {
        transform: `translate(${shift.x}px, ${shift.y}px)`,
        transition: 'transform 160ms cubic-bezier(0.2, 0, 0, 1)',
        position: 'relative',
      };
    } else {
      style = { transition: 'transform 160ms cubic-bezier(0.2, 0, 0, 1)' };
    }

    return {
      'data-drag-id': id,
      style,
      isDragging,
      isOver,
      insertBefore,
      insertAfter,
      // Swallow the click that fires right after a real drag so a draggable link
      // doesn't navigate when the user was only reordering.
      onClickCapture: (e: React.MouseEvent) => {
        if (dragged.current) {
          e.preventDefault();
          e.stopPropagation();
          dragged.current = false;
        }
      },
    };
  };

  // Props for the grab area: a dedicated handle, or the whole item. This is where
  // the grab cursor lives, and `touchAction: 'none'` lets a touch-drag start
  // without the browser scrolling instead. Put these only on the grabbable part.
  const getHandleProps = (id: string) => {
    const style: CSSProperties = {
      cursor: draggingId === id ? 'grabbing' : 'grab',
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    };
    return { style, onPointerDown: (e: PointerEvent) => onPointerDown(e, id) };
  };

  return { containerProps, getItemProps, getHandleProps, draggingId };
};
