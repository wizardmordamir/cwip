import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

// DOM-level coverage for the interactive open/close behavior the SSR tests can't
// reach. The bubble is rendered conditionally (`open &&`), so its presence is the
// open-state signal. Events fire on the root wrapper span (`container.firstChild`),
// which owns the hover/focus/click/key handlers.
const renderTooltip = () => {
  const { container } = render(
    <Tooltip content="Copy to clipboard">
      <button type="button">Copy</button>
    </Tooltip>,
  );
  return { root: container.firstChild as HTMLElement };
};

describe('Tooltip interaction', () => {
  it('shows nothing until hovered, then reveals the bubble on mouse-enter', () => {
    const { root } = renderTooltip();
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(root);
    const bubble = screen.getByRole('tooltip');
    expect(bubble.textContent).toBe('Copy to clipboard');
  });

  it('hides the bubble again on mouse-leave', () => {
    const { root } = renderTooltip();
    fireEvent.mouseEnter(root);
    expect(screen.queryByRole('tooltip')).not.toBeNull();

    fireEvent.mouseLeave(root);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens on focus and closes on blur (keyboard accessible)', () => {
    const { root } = renderTooltip();
    fireEvent.focus(root);
    expect(screen.queryByRole('tooltip')).not.toBeNull();

    fireEvent.blur(root);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('wires aria-describedby to the bubble only while open', () => {
    const { root } = renderTooltip();
    // Closed: the describedby is absent (it points at nothing).
    expect(root.querySelector('span[aria-describedby]')).toBeNull();

    fireEvent.mouseEnter(root);
    const described = root.querySelector('span[aria-describedby]');
    const bubble = screen.getByRole('tooltip');
    expect(described?.getAttribute('aria-describedby')).toBe(bubble.id);
    expect(bubble.id).toBeTruthy();
  });

  it('dismisses on activate (click) — the action changes context', () => {
    const { root } = renderTooltip();
    fireEvent.mouseEnter(root);
    expect(screen.queryByRole('tooltip')).not.toBeNull();

    // A click on the trigger bubbles to the root wrapper's onClick → closes.
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on Escape', () => {
    const { root } = renderTooltip();
    fireEvent.focus(root);
    expect(screen.queryByRole('tooltip')).not.toBeNull();

    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
