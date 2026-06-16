import { describe, expect, it } from 'bun:test';
import { computeNavMenuPlacement } from './navMenuPlacement';

const VIEWPORT = { width: 1280, height: 800 };
const MENU = { width: 224, height: 200 }; // w-56 popover

describe('computeNavMenuPlacement', () => {
  it('opens rightward (toward content) and below the trigger by default', () => {
    // A kebab near the right edge of a narrow left sidebar.
    const p = computeNavMenuPlacement({
      triggerRect: { top: 100, bottom: 124, left: 160, right: 184 },
      menuSize: MENU,
      viewport: VIEWPORT,
    });
    expect(p.left).toBe(160); // opens from the trigger's left, into the content
    expect(p.top).toBe(124 + 6); // below the trigger + gap
  });

  it('clamps the left edge on-screen instead of spilling off (the old bug)', () => {
    // align='right' anchors the menu's right edge to the trigger, which on a narrow
    // sidebar would put left at 184 - 224 = -40 (off the left edge) — clamp to margin.
    const p = computeNavMenuPlacement({
      triggerRect: { top: 100, bottom: 124, left: 160, right: 184 },
      menuSize: MENU,
      viewport: VIEWPORT,
      align: 'right',
    });
    expect(p.left).toBe(8); // clamped to the default margin, never negative
  });

  it('clamps the right edge so a wide menu never spills off the right', () => {
    // Trigger hard against the right edge; opening rightward would overflow.
    const p = computeNavMenuPlacement({
      triggerRect: { top: 100, bottom: 124, left: 1270, right: 1278 },
      menuSize: MENU,
      viewport: VIEWPORT,
    });
    expect(p.left).toBe(VIEWPORT.width - MENU.width - 8); // 1280 - 224 - 8
  });

  it('flips above the trigger when there is no room below but room above', () => {
    // Trigger pinned near the bottom: a downward 200px menu would run off-screen.
    const p = computeNavMenuPlacement({
      triggerRect: { top: 740, bottom: 770, left: 160, right: 184 },
      menuSize: MENU,
      viewport: VIEWPORT,
    });
    expect(p.top).toBe(740 - 200 - 6); // above the trigger - gap
  });

  it('stays below when cramped on both sides, clamped on-screen', () => {
    // Tall menu, little room either way → keep it below but clamp so the bottom
    // edge sits at most `viewport - height - margin`.
    const tall = { width: 224, height: 700 };
    const p = computeNavMenuPlacement({
      triggerRect: { top: 400, bottom: 430, left: 160, right: 184 },
      menuSize: tall,
      viewport: VIEWPORT,
    });
    expect(p.top).toBe(VIEWPORT.height - tall.height - 8); // 800 - 700 - 8 = 92
  });

  it('floors clamp at margin so an oversized menu still starts on-screen', () => {
    // Menu taller than the viewport: the clamp upper bound would go negative, so it
    // floors at the margin rather than pushing the top off-screen.
    const huge = { width: 224, height: 1000 };
    const p = computeNavMenuPlacement({
      triggerRect: { top: 400, bottom: 430, left: 160, right: 184 },
      menuSize: huge,
      viewport: VIEWPORT,
    });
    expect(p.top).toBe(8);
  });

  it('caps maxHeight to the viewport minus margins', () => {
    const p = computeNavMenuPlacement({
      triggerRect: { top: 100, bottom: 124, left: 160, right: 184 },
      menuSize: MENU,
      viewport: VIEWPORT,
    });
    expect(p.maxHeight).toBe(VIEWPORT.height - 2 * 8); // 784
  });

  it('respects custom gap and margin overrides', () => {
    const p = computeNavMenuPlacement({
      triggerRect: { top: 100, bottom: 124, left: 160, right: 184 },
      menuSize: MENU,
      viewport: VIEWPORT,
      gap: 12,
      margin: 16,
    });
    expect(p.top).toBe(124 + 12);
    expect(p.maxHeight).toBe(VIEWPORT.height - 2 * 16);
  });
});
