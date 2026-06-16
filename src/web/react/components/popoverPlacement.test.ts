import { describe, expect, it } from 'bun:test';
import { computePopoverPlacement } from './popoverPlacement';

describe('computePopoverPlacement', () => {
  it('opens downward when there is more room below (auto)', () => {
    // Trigger near the top: lots of room below, little above.
    const p = computePopoverPlacement({ triggerRect: { top: 40, bottom: 70 }, viewportHeight: 800 });
    expect(p.dir).toBe('down');
    expect(p.maxHeight).toBe(800 - 70 - 8); // spaceBelow - gap
  });

  it('flips upward when the trigger sits near the bottom (auto)', () => {
    // The side-nav "Show hidden" case: trigger pinned to the viewport bottom, so a
    // downward popover would be clipped off-screen — auto must open upward instead.
    const p = computePopoverPlacement({ triggerRect: { top: 760, bottom: 790 }, viewportHeight: 800 });
    expect(p.dir).toBe('up');
    expect(p.maxHeight).toBe(760 - 8); // spaceAbove - gap
  });

  it('prefers downward on an exact tie (auto)', () => {
    // spaceBelow === spaceAbove → the `>=` picks down deterministically.
    const p = computePopoverPlacement({ triggerRect: { top: 385, bottom: 415 }, viewportHeight: 800 });
    expect(p.dir).toBe('down');
  });

  it('honors an explicit direction but still clamps maxHeight to that side', () => {
    // Forced up even though there is far more room below; height clamps to the
    // (smaller) room above so the list never overshoots the top edge.
    const up = computePopoverPlacement({
      triggerRect: { top: 200, bottom: 230 },
      viewportHeight: 800,
      direction: 'up',
    });
    expect(up.dir).toBe('up');
    expect(up.maxHeight).toBe(200 - 8);

    // Forced down even though there is more room above (auto would have flipped
    // up); height clamps to the room below.
    const down = computePopoverPlacement({
      triggerRect: { top: 500, bottom: 530 },
      viewportHeight: 800,
      direction: 'down',
    });
    expect(down.dir).toBe('down');
    expect(down.maxHeight).toBe(800 - 530 - 8);
  });

  it('floors maxHeight at minHeight so a cramped side stays scrollable', () => {
    // Only 10px below + an 8px gap would be -... → clamp up to the 120 default.
    const p = computePopoverPlacement({
      triggerRect: { top: 760, bottom: 790 },
      viewportHeight: 800,
      direction: 'down',
    });
    expect(p.maxHeight).toBe(120);
  });

  it('respects custom gap and minHeight overrides', () => {
    const p = computePopoverPlacement({
      triggerRect: { top: 40, bottom: 70 },
      viewportHeight: 800,
      gap: 20,
      minHeight: 50,
    });
    expect(p.maxHeight).toBe(800 - 70 - 20);
  });

  it('floors a fractional room down to a whole pixel', () => {
    const p = computePopoverPlacement({ triggerRect: { top: 40, bottom: 70.6 }, viewportHeight: 800 });
    expect(p.maxHeight).toBe(Math.floor(800 - 70.6 - 8));
  });
});
