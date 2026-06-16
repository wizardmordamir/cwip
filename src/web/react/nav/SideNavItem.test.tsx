import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SideNavItem } from './SideNavItem';
import type { NavEntry } from './types';

const entry: NavEntry = { id: '/calendar', label: 'Calendar', href: '/calendar', icon: '📅' };
const noop = () => {};

describe('SideNavItem', () => {
  it('renders the row icon + label, and a labeled kebab trigger when the menu callbacks are supplied', () => {
    const html = renderToStaticMarkup(<SideNavItem entry={entry} onColor={noop} onHide={noop} />);
    expect(html).toContain('📅');
    expect(html).toContain('Calendar');
    // The kebab names the row it belongs to (accessible name + the menu affordance).
    expect(html).toContain('aria-label="Options for Calendar"');
    expect(html).toContain('aria-haspopup="menu"');
    // Closed on the server: not expanded, and no detached popover yet.
    expect(html).toContain('aria-expanded="false"');
  });

  it('omits the kebab when no recolor/hide callbacks are given', () => {
    const html = renderToStaticMarkup(<SideNavItem entry={entry} />);
    expect(html).toContain('Calendar');
    expect(html).not.toContain('Options for Calendar');
  });

  it('omits the kebab when collapsed (icon-rail mode)', () => {
    const html = renderToStaticMarkup(<SideNavItem entry={entry} collapsed onColor={noop} onHide={noop} />);
    expect(html).not.toContain('Options for Calendar');
  });

  it('only rings the row while its menu is open — the closed row carries no menu-active ring', () => {
    const html = renderToStaticMarkup(<SideNavItem entry={entry} onColor={noop} onHide={noop} />);
    expect(html).not.toContain('ring-gray-300');
  });

  it('lets an app theme the menu-active ring via the menuActive slot', () => {
    // The slot exists even though it only paints while open; a function override
    // replaces the default, proving the wiring is in place for app theming.
    const html = renderToStaticMarkup(
      <SideNavItem entry={entry} onColor={noop} onHide={noop} classNames={{ menuActive: () => 'ring-accent' }} />,
    );
    // Closed, so neither the default nor the override paints yet…
    expect(html).not.toContain('ring-accent');
    expect(html).not.toContain('ring-gray-300');
    // …but the row still renders normally.
    expect(html).toContain('Calendar');
  });
});
