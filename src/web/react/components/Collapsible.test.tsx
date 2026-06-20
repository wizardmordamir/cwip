import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Collapsible, DisclosureArrow, DisclosureButton } from './Collapsible';

describe('DisclosureArrow', () => {
  it('renders a chevron and rotates only when open', () => {
    const closed = renderToStaticMarkup(<DisclosureArrow open={false} />);
    const open = renderToStaticMarkup(<DisclosureArrow open />);
    expect(closed).toContain('<svg');
    expect(closed).not.toContain('rotate-90');
    expect(open).toContain('rotate-90');
  });

  it('is aria-hidden and merges a class override', () => {
    const html = renderToStaticMarkup(<DisclosureArrow open={false} classNames={{ root: 'mine-x' }} />);
    expect(html).toContain('aria-hidden');
    expect(html).toContain('mine-x');
  });
});

describe('DisclosureButton', () => {
  it('places the arrow before the content (leading/left edge)', () => {
    const html = renderToStaticMarkup(
      <DisclosureButton open={false} onToggle={() => {}}>
        <span>Label</span>
      </DisclosureButton>,
    );
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Label'));
    expect(html).toContain('aria-expanded="false"');
  });

  it('reflects open in aria-expanded and fires onToggle on click', () => {
    let toggles = 0;
    render(
      <DisclosureButton open onToggle={() => toggles++}>
        Section
      </DisclosureButton>,
    );
    const button = screen.getByRole('button', { name: /Section/ });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(toggles).toBe(1);
  });
});

describe('Collapsible', () => {
  it('uncontrolled: body hidden until the header is clicked', () => {
    render(
      <Collapsible header="Details">
        <p>secret body</p>
      </Collapsible>,
    );
    expect(screen.queryByText('secret body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Details/ }));
    expect(screen.getByText('secret body')).not.toBeNull();
  });

  it('honours defaultOpen and wires aria-controls to the body', () => {
    render(
      <Collapsible header="Open me" defaultOpen>
        <p>visible body</p>
      </Collapsible>,
    );
    const button = screen.getByRole('button', { name: /Open me/ });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const body = screen.getByText('visible body').closest('div');
    expect(body).not.toBeNull();
    expect(button.getAttribute('aria-controls')).toBe(body?.id ?? null);
  });

  it('controlled: open is driven by the prop and onOpenChange reports the next state', () => {
    const seen: boolean[] = [];
    const { rerender } = render(
      <Collapsible header="Ctl" open={false} onOpenChange={(o) => seen.push(o)}>
        body
      </Collapsible>,
    );
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ctl/ }));
    expect(seen).toEqual([true]); // requests open; still closed until the prop flips
    expect(screen.queryByText('body')).toBeNull();
    rerender(
      <Collapsible header="Ctl" open onOpenChange={(o) => seen.push(o)}>
        body
      </Collapsible>,
    );
    expect(screen.getByText('body')).not.toBeNull();
  });

  it('keepMounted leaves the body in the DOM (hidden) while closed', () => {
    render(
      <Collapsible header="Keep" keepMounted>
        <p>kept body</p>
      </Collapsible>,
    );
    const body = screen.getByText('kept body');
    expect(body).not.toBeNull();
    expect(body.closest('[hidden]')).not.toBeNull();
  });
});
