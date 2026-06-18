import { afterEach, describe, expect, it } from 'bun:test';
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

// On touch (no-hover) devices the hover/focus path is gone, so the component
// falls back per `mobile`. We simulate a touch device by stubbing matchMedia so
// the `(hover: hover) and (pointer: fine)` query reports no match.
const realMatchMedia = window.matchMedia;
const simulateHover = (hasHover: boolean) => {
  // Minimal MediaQueryList stub for the test environment.
  window.matchMedia = ((query: string) => ({
    matches: hasHover,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

describe('Tooltip touch behavior', () => {
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("mobile='icon' (default): appends a disclosure icon that toggles the bubble on tap", () => {
    simulateHover(false);
    render(
      <Tooltip content="Copy to clipboard">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const icon = screen.getByRole('button', { name: 'More info' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.click(icon);
    expect(screen.getByRole('tooltip').textContent).toBe('Copy to clipboard');

    // A second tap on the icon toggles it back off.
    fireEvent.click(icon);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it("mobile='icon': an outside tap closes the open bubble", () => {
    simulateHover(false);
    render(
      <Tooltip content="Copy to clipboard">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More info' }));
    expect(screen.queryByRole('tooltip')).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it("mobile='icon': renders a custom mobileIcon when provided", () => {
    simulateHover(false);
    render(
      <Tooltip content="Help" mobileIcon={<span data-testid="custom-icon">?</span>}>
        <span>Field</span>
      </Tooltip>,
    );
    expect(screen.getByTestId('custom-icon')).not.toBeNull();
  });

  it("mobile='tap': no icon — tapping the trigger reveals the bubble", () => {
    simulateHover(false);
    const { container } = render(
      <Tooltip content="Run" mobile="tap">
        <button type="button">Run</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('button', { name: 'More info' })).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.click(container.firstChild as HTMLElement);
    expect(screen.getByRole('tooltip').textContent).toBe('Run');
  });

  it("mobile='off': no touch affordance at all", () => {
    simulateHover(false);
    const { container } = render(
      <Tooltip content="Nope" mobile="off">
        <button type="button">X</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('button', { name: 'More info' })).toBeNull();
    fireEvent.click(container.firstChild as HTMLElement);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('empty content adds no disclosure icon (conditional tooltip passthrough)', () => {
    simulateHover(false);
    render(
      <Tooltip content=''>
        <span>Just text</span>
      </Tooltip>,
    );
    expect(screen.queryByRole('button', { name: 'More info' })).toBeNull();
  });

  it('on a hover device, no disclosure icon is added', () => {
    simulateHover(true);
    render(
      <Tooltip content="Copy">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('button', { name: 'More info' })).toBeNull();
  });
});
