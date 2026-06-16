import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NavItemMenu } from './NavItemMenu';

// The popover is portaled to document.body and gated purely on `open`, so it
// appears only on an explicit kebab click — never on hover. `screen` queries the
// whole document, so the portal content is reachable.
const noop = () => {};

describe('NavItemMenu popover', () => {
  it('opens the menu on kebab click and reflects state via aria-expanded', () => {
    render(<NavItemMenu label="Inbox" onColor={noop} onHide={noop} />);
    const trigger = screen.getByRole('button', { name: 'Options for Inbox' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: 'Options for Inbox' });
    // The owning row's label is echoed in the popover header.
    expect(menu.textContent).toContain('Inbox');
  });

  it('closes on Escape', () => {
    render(<NavItemMenu label="Inbox" onColor={noop} onHide={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for Inbox' }));
    expect(screen.queryByRole('menu')).not.toBeNull();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes when the full-screen backdrop is clicked', () => {
    render(<NavItemMenu label="Inbox" onColor={noop} onHide={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for Inbox' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('runs onHide and closes when "Hide from sidebar" is clicked', () => {
    let hidden = 0;
    render(<NavItemMenu label="Inbox" onColor={noop} onHide={() => hidden++} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for Inbox' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide from sidebar' }));
    expect(hidden).toBe(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('reports open/close transitions through onOpenChange', () => {
    const calls: boolean[] = [];
    render(<NavItemMenu label="Inbox" onColor={noop} onHide={noop} onOpenChange={(o) => calls.push(o)} />);
    const trigger = screen.getByRole('button', { name: 'Options for Inbox' });
    // Mounts closed (reports false once), then open, then close.
    fireEvent.click(trigger);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(calls).toContain(true);
    expect(calls.at(-1)).toBe(false);
  });

  it('renders app-specific children actions inside the menu', () => {
    render(
      <NavItemMenu label="Inbox" onColor={noop} onHide={noop}>
        <button type="button">Rename</button>
      </NavItemMenu>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Options for Inbox' }));
    expect(screen.getByRole('button', { name: 'Rename' })).not.toBeNull();
  });
});
