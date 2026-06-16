// DOM/interaction tests for the drag engine hooks.
// Pure-function tests (dropTargetIndex, slotShift, insertionIndexAcross, etc.)
// live in hooks.test.ts — these cover the full pointer-event lifecycle.
import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { type CrossContainerMove, useCrossContainerDrag } from './useCrossContainerDrag';
import { useDragReorder } from './useDragReorder';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Patch getBoundingClientRect so the drag engine sees real geometry. */
const mockRect = (el: HTMLElement, r: { left: number; top: number; width: number; height: number }) => {
  el.getBoundingClientRect = () =>
    ({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.left + r.width,
      bottom: r.top + r.height,
      x: r.left,
      y: r.top,
      toJSON: () => ({}),
    }) as DOMRect;
};

// ─── useDragReorder ──────────────────────────────────────────────────────────

/**
 * Minimal test harness: three stacked items, each with a dedicated grab handle
 * (`data-testid="handle-{id}"`). The outer div carries containerProps so pointer
 * events route correctly. `onClickItem` lets click-suppression tests observe
 * whether an inner click reached its handler.
 */
function DragList({
  ids: initial,
  onReorder,
  onClickItem,
}: {
  ids: string[];
  onReorder?: (next: string[]) => void;
  onClickItem?: (id: string) => void;
}) {
  const [ids, setIds] = useState(initial);
  const { containerProps, getItemProps, getHandleProps } = useDragReorder({
    ids,
    onReorder: (next) => {
      setIds(next);
      onReorder?.(next);
    },
  });
  return (
    <div {...containerProps} data-testid="container">
      {ids.map((id) => {
        const { style, onClickCapture } = getItemProps(id);
        return (
          <div key={id} data-testid={`item-${id}`} data-drag-id={id} style={style} onClickCapture={onClickCapture}>
            <span data-testid={`handle-${id}`} {...getHandleProps(id)} />
            <button type="button" data-testid={`btn-${id}`} onClick={() => onClickItem?.(id)}>
              {id}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Assign 30-px-tall stacked rects to the named items and the container element. */
const mockStackedItems = (ids: string[], container: HTMLElement) => {
  for (const [i, id] of ids.entries()) {
    mockRect(screen.getByTestId(`item-${id}`), { left: 0, top: i * 30, width: 100, height: 30 });
  }
  mockRect(container, { left: 0, top: 0, width: 100, height: ids.length * 30 });
};

describe('useDragReorder — activation threshold', () => {
  it('does not activate drag for a move under 6 px', () => {
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 18 }); // 3 px — below threshold
    fireEvent.pointerUp(container);

    expect(reorders).toHaveLength(0);
    expect(screen.getByTestId('item-a').style.opacity).toBe('');
  });

  it('activates drag once the pointer crosses the 6 px threshold', () => {
    render(<DragList ids={['a', 'b', 'c']} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 22 }); // 7 px — crosses threshold

    // The dragged item gets the lifted appearance.
    expect(screen.getByTestId('item-a').style.opacity).toBe('0.6');
  });

  it('ignores non-primary button presses (right-click, pen eraser, etc.)', () => {
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 2, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 85 }); // would be a large enough move
    fireEvent.pointerUp(container);

    expect(reorders).toHaveLength(0);
    expect(screen.getByTestId('item-a').style.opacity).toBe('');
  });
});

describe('useDragReorder — reorder callback', () => {
  it('calls onReorder with the new order on drop', () => {
    // Layout: a at y 0–30, b at 30–60, c at 60–90.
    // Drag a (top) to y=85 → past c's centre (75) → a lands at the end.
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 85 });
    fireEvent.pointerUp(container);

    expect(reorders).toEqual([['b', 'c', 'a']]);
  });

  it('does NOT call onReorder when dropped back at the original slot', () => {
    // Drag a to y=22 (7 px — activates), nearest other item is b (centre 45);
    // pointer is above b → slot 0 (home) → no real change.
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 22 }); // activates, lands home
    fireEvent.pointerUp(container);

    expect(reorders).toHaveLength(0);
  });

  it('uses the LAST pointermove position as the drop target', () => {
    // First move at y=22 activates and would land a at slot 0 (home).
    // Second move at y=55 retargets to slot 1 (between b and c).
    // y=55 is closer to b (centre 45, dist 10) than c (centre 75, dist 20);
    // pointer is BELOW b's centre → after b → slot 1.
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 22 }); // activate near home
    fireEvent.pointerMove(container, { clientX: 50, clientY: 55 }); // slide to slot 1
    fireEvent.pointerUp(container);

    expect(reorders).toEqual([['b', 'a', 'c']]);
  });

  it('resets dragging styles on drop', () => {
    render(<DragList ids={['a', 'b', 'c']} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 85 });
    expect(screen.getByTestId('item-a').style.opacity).toBe('0.6');

    fireEvent.pointerUp(container);
    // After drop and re-render (a moved to end), no item carries the dragging style.
    expect(screen.getByTestId('item-b').style.opacity).toBe('');
    expect(screen.getByTestId('item-c').style.opacity).toBe('');
    expect(screen.getByTestId('item-a').style.opacity).toBe('');
  });

  it('commits the drop and resets styles on pointercancel (same as pointerup)', () => {
    // finish() is shared between pointerup and pointercancel — both commit the
    // pending drop so the list never silently snaps back. The key guarantee is
    // that dragging styles are cleared regardless.
    const reorders: string[][] = [];
    render(<DragList ids={['a', 'b', 'c']} onReorder={(r) => reorders.push(r)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 85 });
    fireEvent.pointerCancel(container);

    expect(reorders).toEqual([['b', 'c', 'a']]); // same result as pointerUp
    // Dragging styles must be cleared even on cancel.
    expect(screen.getByTestId('item-a').style.opacity).toBe('');
  });
});

describe('useDragReorder — click suppression', () => {
  it('suppresses the inner-element click that fires immediately after a drag', () => {
    // In real browsers a touch/drag raises a synthetic click on the drag target.
    // onClickCapture intercepts it so draggable links/buttons do not activate.
    const clicked: string[] = [];
    render(<DragList ids={['a', 'b', 'c']} onClickItem={(id) => clicked.push(id)} />);
    const container = screen.getByTestId('container');
    mockStackedItems(['a', 'b', 'c'], container);

    // Complete a real drag.
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 85 });
    fireEvent.pointerUp(container);

    // The trailing synthetic click on the item's inner button must be swallowed.
    fireEvent.click(screen.getByTestId('btn-a'));
    expect(clicked).toHaveLength(0);
  });

  it('allows inner-element clicks after a non-drag press (tap)', () => {
    const clicked: string[] = [];
    render(<DragList ids={['a', 'b', 'c']} onClickItem={(id) => clicked.push(id)} />);
    const container = screen.getByTestId('container');

    // Press and release without enough movement to activate drag.
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(container, { clientX: 50, clientY: 18 }); // 3 px < threshold
    fireEvent.pointerUp(container);

    // The click that follows a tap must NOT be swallowed.
    fireEvent.click(screen.getByTestId('btn-a'));
    expect(clicked).toContain('a');
  });
});

// ─── useCrossContainerDrag ───────────────────────────────────────────────────

/**
 * Minimal two-column kanban board. Each column's div carries containerProps
 * so pointer events route to the shared handlers. `onMove` records every
 * committed drop for assertion.
 */
function KanbanBoard({
  containers,
  onMove,
}: {
  containers: Record<string, string[]>;
  onMove?: (move: CrossContainerMove) => void;
}) {
  const { getContainerProps, getItemProps, getHandleProps } = useCrossContainerDrag({
    containers,
    onMove: (move) => onMove?.(move),
  });
  return (
    <div data-testid="board">
      {Object.entries(containers).map(([colId, ids]) => (
        <div key={colId} data-testid={`col-${colId}`} {...getContainerProps(colId)}>
          {ids.map((id) => {
            const { style, onClickCapture } = getItemProps(colId, id);
            return (
              <div key={id} data-testid={`item-${id}`} data-drag-id={id} style={style} onClickCapture={onClickCapture}>
                <span data-testid={`handle-${id}`} {...getHandleProps(colId, id)} />
                {id}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Geometry for a two-column board:
 *   col1 at x 0–100, items stacked 30 px tall starting at y=0.
 *   col2 at x 110–210, items stacked 30 px tall starting at y=0.
 */
const mockTwoColumns = (col1Ids: string[], col2Ids: string[]) => {
  const col1 = screen.getByTestId('col-col1');
  const col2 = screen.getByTestId('col-col2');
  mockRect(col1, { left: 0, top: 0, width: 100, height: Math.max(90, col1Ids.length * 30) });
  for (const [i, id] of col1Ids.entries()) {
    mockRect(screen.getByTestId(`item-${id}`), { left: 0, top: i * 30, width: 100, height: 30 });
  }
  mockRect(col2, { left: 110, top: 0, width: 100, height: Math.max(90, col2Ids.length * 30) });
  for (const [i, id] of col2Ids.entries()) {
    mockRect(screen.getByTestId(`item-${id}`), { left: 110, top: i * 30, width: 100, height: 30 });
  }
};

describe('useCrossContainerDrag — same-column reorder', () => {
  it('calls onMove when the card lands at a different slot within its column', () => {
    // a at y 0–30, b at 30–60, c at 60–90.
    // Drag a (top) to y=85 (past c's centre) → a lands at the end.
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b', 'c'], col2: ['d', 'e'] }} onMove={(m) => moves.push(m)} />);
    mockTwoColumns(['a', 'b', 'c'], ['d', 'e']);

    const col1 = screen.getByTestId('col-col1');
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 85 }); // activates + targets end of col1
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ id: 'a', from: 'col1', to: 'col1', index: 2 });
  });

  it('does NOT call onMove when the card is dropped back at its original slot', () => {
    // Drag a to y=22 (7 px — activates), nearest candidate is b (centre 45);
    // pointer is ABOVE b → slot 0 (home) → no-op.
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b', 'c'], col2: ['d', 'e'] }} onMove={(m) => moves.push(m)} />);
    mockTwoColumns(['a', 'b', 'c'], ['d', 'e']);

    const col1 = screen.getByTestId('col-col1');
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 22 }); // activates, lands home
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(0);
  });
});

describe('useCrossContainerDrag — cross-column move', () => {
  it('fires onMove with the correct target column and slot', () => {
    // Drag a from col1 into col2 at the end: pointer lands at (160, 85)
    // which is inside col2 (x 110–210) past e's centre (y 45) → slot 2 (end).
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b', 'c'], col2: ['d', 'e'] }} onMove={(m) => moves.push(m)} />);
    mockTwoColumns(['a', 'b', 'c'], ['d', 'e']);

    const col1 = screen.getByTestId('col-col1');
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 22 }); // activate (7 px)
    fireEvent.pointerMove(col1, { clientX: 160, clientY: 85 }); // cross to col2, after e
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(1);
    expect(moves[0]).toEqual({ id: 'a', from: 'col1', to: 'col2', index: 2 });
  });

  it('resolves the insertion slot within the target column from pointer coordinates', () => {
    // Drag a into the MIDDLE of col2: pointer at (160, 35), above e's centre (y 45).
    // d at y 0–30 (centre 15), e at 30–60 (centre 45).
    // Nearest item to (160,35): e (dist 10) — above e's centre → before e → slot 1.
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b', 'c'], col2: ['d', 'e'] }} onMove={(m) => moves.push(m)} />);
    mockTwoColumns(['a', 'b', 'c'], ['d', 'e']);

    const col1 = screen.getByTestId('col-col1');
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 22 }); // activate
    fireEvent.pointerMove(col1, { clientX: 160, clientY: 35 }); // cross to col2, before e
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(1);
    expect(moves[0]).toEqual({ id: 'a', from: 'col1', to: 'col2', index: 1 });
  });

  it('drops into an empty column at slot 0', () => {
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b'], col2: [] }} onMove={(m) => moves.push(m)} />);

    const col1 = screen.getByTestId('col-col1');
    const col2 = screen.getByTestId('col-col2');
    mockRect(col1, { left: 0, top: 0, width: 100, height: 90 });
    mockRect(screen.getByTestId('item-a'), { left: 0, top: 0, width: 100, height: 30 });
    mockRect(screen.getByTestId('item-b'), { left: 0, top: 30, width: 100, height: 30 });
    mockRect(col2, { left: 110, top: 0, width: 100, height: 90 });

    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 22 }); // activate
    fireEvent.pointerMove(col1, { clientX: 160, clientY: 45 }); // cross to empty col2
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(1);
    expect(moves[0]).toEqual({ id: 'a', from: 'col1', to: 'col2', index: 0 });
  });

  it('does not start drag for a tiny move', () => {
    const moves: CrossContainerMove[] = [];
    render(<KanbanBoard containers={{ col1: ['a', 'b'], col2: ['c'] }} onMove={(m) => moves.push(m)} />);
    mockTwoColumns(['a', 'b'], ['c']);

    const col1 = screen.getByTestId('col-col1');
    fireEvent.pointerDown(screen.getByTestId('handle-a'), { button: 0, clientX: 50, clientY: 15 });
    fireEvent.pointerMove(col1, { clientX: 50, clientY: 18 }); // 3 px < 6 px threshold
    fireEvent.pointerUp(col1);

    expect(moves).toHaveLength(0);
  });
});
