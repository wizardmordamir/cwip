import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { type CrossContainerMove, useCrossContainerDrag } from './useCrossContainerDrag';
import { useDragReorder } from './useDragReorder';

// DOM/interaction tests for the two pointer drag engines. The pure geometry/index
// helpers they delegate to (dropTargetIndex, reorderByIndex, insertionIndexAcross,
// crossInsertEdge, positionAtIndex …) are covered in hooks.test.ts; here we drive
// real pointer events through `render`ed harnesses and assert the engines' STATE
// behaviour: that a threshold-passing drag activates and commits the right
// reorder / cross-container move, that a sub-threshold tap stays a click, and that
// the dragged card lifts (single-list) / floats with position:fixed (cross-list).
//
// happy-dom gives every element a zero `getBoundingClientRect`, so each test stamps
// a concrete layout onto the items + their container(s) before activating the drag —
// otherwise every box would share centre (0,0) and the geometry would be degenerate.

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Pin an element's layout box so the engines' captureGeometry reads real coords. */
const setRect = (el: Element, b: Box): void => {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      left: b.left,
      top: b.top,
      width: b.width,
      height: b.height,
      right: b.left + b.width,
      bottom: b.top + b.height,
      x: b.left,
      y: b.top,
      toJSON: () => ({}),
    }) as DOMRect;
};

// ── single-list harness ──────────────────────────────────────────────────────

function ReorderHarness({
  ids,
  onReorder,
  onItemClick,
}: {
  ids: string[];
  onReorder: (next: string[]) => void;
  onItemClick?: (id: string) => void;
}) {
  const { containerProps, getItemProps, getHandleProps } = useDragReorder({ ids, onReorder });
  return (
    <div data-testid="container" {...containerProps}>
      {ids.map((id) => {
        const { isDragging, isOver, insertBefore, insertAfter, style: itemStyle, ...itemDom } = getItemProps(id);
        const { style: handleStyle, ...handleDom } = getHandleProps(id);
        return (
          <button
            type="button"
            key={id}
            data-testid={`item-${id}`}
            {...itemDom}
            {...handleDom}
            style={{ ...itemStyle, ...handleStyle }}
            onClick={() => onItemClick?.(id)}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}

/** Stack `ids` as a vertical list: 200×100 boxes from top 0, container 200×(100·n). */
const layoutVerticalList = (ids: string[]): void => {
  ids.forEach((id, i) => {
    setRect(screen.getByTestId(`item-${id}`), { left: 0, top: i * 100, width: 200, height: 100 });
  });
  setRect(screen.getByTestId('container'), { left: 0, top: 0, width: 200, height: ids.length * 100 });
};

describe('useDragReorder (pointer interaction)', () => {
  it('activates past the threshold and commits the dropped order', () => {
    const reorders: string[][] = [];
    render(<ReorderHarness ids={['a', 'b', 'c']} onReorder={(n) => reorders.push(n)} />);
    layoutVerticalList(['a', 'b', 'c']);

    const container = screen.getByTestId('container');
    // Press the first card at its centre, drag it down past the last card, release.
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 260 });
    fireEvent.pointerUp(container, { clientX: 100, clientY: 260 });

    expect(reorders).toEqual([['b', 'c', 'a']]);
  });

  it('lifts the dragged card (relative + zIndex + translate + translucent) while dragging', () => {
    render(<ReorderHarness ids={['a', 'b', 'c']} onReorder={() => {}} />);
    layoutVerticalList(['a', 'b', 'c']);

    const container = screen.getByTestId('container');
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 260 });

    const dragged = screen.getByTestId('item-a');
    expect(dragged.style.position).toBe('relative');
    expect(dragged.style.zIndex).toBe('50');
    expect(dragged.style.transform).toContain('translate');
    expect(dragged.style.opacity).toBe('0.6');
  });

  it('treats a sub-threshold press as a tap — no reorder, the click still fires', () => {
    const reorders: string[][] = [];
    const clicks: string[] = [];
    render(
      <ReorderHarness
        ids={['a', 'b', 'c']}
        onReorder={(n) => reorders.push(n)}
        onItemClick={(id) => clicks.push(id)}
      />,
    );
    layoutVerticalList(['a', 'b', 'c']);

    const container = screen.getByTestId('container');
    const item = screen.getByTestId('item-a');
    // Press + tiny move (under the 6px activation distance) + release, then the click.
    fireEvent.pointerDown(item, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(container, { clientX: 102, clientY: 51 });
    fireEvent.pointerUp(container, { clientX: 102, clientY: 51 });
    fireEvent.click(item);

    expect(reorders).toEqual([]);
    expect(clicks).toEqual(['a']);
  });

  it('suppresses the trailing click after a real drag', () => {
    const clicks: string[] = [];
    render(<ReorderHarness ids={['a', 'b', 'c']} onReorder={() => {}} onItemClick={(id) => clicks.push(id)} />);
    layoutVerticalList(['a', 'b', 'c']);

    const container = screen.getByTestId('container');
    const item = screen.getByTestId('item-a');
    fireEvent.pointerDown(item, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 260 });
    fireEvent.pointerUp(container, { clientX: 100, clientY: 260 });
    // The synthetic click that a browser fires right after the drag is swallowed.
    fireEvent.click(item);

    expect(clicks).toEqual([]);
  });

  it('ignores a non-primary (e.g. right) button press', () => {
    const reorders: string[][] = [];
    render(<ReorderHarness ids={['a', 'b', 'c']} onReorder={(n) => reorders.push(n)} />);
    layoutVerticalList(['a', 'b', 'c']);

    const container = screen.getByTestId('container');
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 2, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 260 });
    fireEvent.pointerUp(container, { clientX: 100, clientY: 260 });

    expect(reorders).toEqual([]);
  });
});

// ── cross-container (kanban) harness ─────────────────────────────────────────

function BoardHarness({
  containers,
  onMove,
  onItemClick,
}: {
  containers: Record<string, string[]>;
  onMove: (m: CrossContainerMove) => void;
  onItemClick?: (id: string) => void;
}) {
  const dnd = useCrossContainerDrag({ containers, onMove });
  return (
    <div>
      {Object.entries(containers).map(([cid, ids]) => (
        <div key={cid} data-testid={`col-${cid}`} {...dnd.getContainerProps(cid)}>
          {ids.map((id) => {
            const { isDragging, insertBefore, insertAfter, style: itemStyle, ...itemDom } = dnd.getItemProps(cid, id);
            const { style: handleStyle, ...handleDom } = dnd.getHandleProps(cid, id);
            return (
              <button
                type="button"
                key={id}
                data-testid={`item-${id}`}
                {...itemDom}
                {...handleDom}
                style={{ ...itemStyle, ...handleStyle }}
                onClick={() => onItemClick?.(id)}
              >
                {id}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Two side-by-side columns: `todo` (left 0) and `done` (left 200), each 200×400,
// cards 200×100 stacked from the column top.
const layoutBoard = (containers: Record<string, string[]>): void => {
  const cols = Object.keys(containers);
  cols.forEach((cid, c) => {
    const left = c * 200;
    setRect(screen.getByTestId(`col-${cid}`), { left, top: 0, width: 200, height: 400 });
    containers[cid].forEach((id, i) => {
      setRect(screen.getByTestId(`item-${id}`), { left, top: i * 100, width: 200, height: 100 });
    });
  });
};

describe('useCrossContainerDrag (pointer interaction)', () => {
  it('emits a cross-container move with the landing slot', () => {
    const moves: CrossContainerMove[] = [];
    render(<BoardHarness containers={{ todo: ['a', 'b'], done: ['c'] }} onMove={(m) => moves.push(m)} />);
    layoutBoard({ todo: ['a', 'b'], done: ['c'] });

    const done = screen.getByTestId('col-done');
    // Pick up `a` from todo, carry it over the top half of `c` in done, release.
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(done, { clientX: 300, clientY: 30 });
    fireEvent.pointerUp(done, { clientX: 300, clientY: 30 });

    expect(moves).toEqual([{ id: 'a', from: 'todo', to: 'done', index: 0 }]);
  });

  it('emits a same-container reorder (from === to) when the order changes', () => {
    const moves: CrossContainerMove[] = [];
    render(<BoardHarness containers={{ todo: ['a', 'b'], done: ['c'] }} onMove={(m) => moves.push(m)} />);
    layoutBoard({ todo: ['a', 'b'], done: ['c'] });

    const todo = screen.getByTestId('col-todo');
    // Drag `a` below `b` within todo.
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(todo, { clientX: 100, clientY: 170 });
    fireEvent.pointerUp(todo, { clientX: 100, clientY: 170 });

    expect(moves).toEqual([{ id: 'a', from: 'todo', to: 'todo', index: 1 }]);
  });

  it('floats the dragged card with position:fixed pinned to its captured box', () => {
    render(<BoardHarness containers={{ todo: ['a', 'b'], done: ['c'] }} onMove={() => {}} />);
    layoutBoard({ todo: ['a', 'b'], done: ['c'] });

    const done = screen.getByTestId('col-done');
    fireEvent.pointerDown(screen.getByTestId('item-a'), { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(done, { clientX: 300, clientY: 30 });

    const dragged = screen.getByTestId('item-a');
    expect(dragged.style.position).toBe('fixed');
    expect(dragged.style.zIndex).toBe('1000');
    expect(dragged.style.width).toBe('200px');
    expect(dragged.style.transform).toContain('translate');
  });

  it('treats a sub-threshold press as a tap — no move, the click still fires', () => {
    const moves: CrossContainerMove[] = [];
    const clicks: string[] = [];
    render(
      <BoardHarness
        containers={{ todo: ['a', 'b'], done: ['c'] }}
        onMove={(m) => moves.push(m)}
        onItemClick={(id) => clicks.push(id)}
      />,
    );
    layoutBoard({ todo: ['a', 'b'], done: ['c'] });

    const todo = screen.getByTestId('col-todo');
    const item = screen.getByTestId('item-a');
    fireEvent.pointerDown(item, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(todo, { clientX: 100, clientY: 50 });
    fireEvent.click(item);

    expect(moves).toEqual([]);
    expect(clicks).toEqual(['a']);
  });
});
