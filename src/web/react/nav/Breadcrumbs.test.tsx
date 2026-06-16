import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { type BreadcrumbNode, Breadcrumbs, buildBreadcrumbTrail } from './Breadcrumbs';

const NODES: Record<string, BreadcrumbNode> = {
  '/': { key: '/', label: 'Home' },
  '/people': { key: '/people', label: 'Social', parent: '/' },
  '/contacts': { key: '/contacts', label: 'Contacts', parent: '/people' },
};

describe('buildBreadcrumbTrail', () => {
  it('walks parent links from current up to the root, returning crumbs root→leaf', () => {
    const trail = buildBreadcrumbTrail(NODES, '/contacts');
    expect(trail.map((c) => c.label)).toEqual(['Home', 'Social', 'Contacts']);
    expect(trail.map((c) => c.href)).toEqual(['/', '/people', '/contacts']);
  });

  it('defaults each crumb href to its node key when href is absent', () => {
    const trail = buildBreadcrumbTrail(NODES, '/people');
    expect(trail.at(-1)?.href).toBe('/people');
  });

  it('overrides the leaf label/href via options (e.g. a record name)', () => {
    const trail = buildBreadcrumbTrail(NODES, '/contacts', { leafLabel: 'Ada Lovelace', leafHref: '/contacts/42' });
    expect(trail.at(-1)).toMatchObject({ label: 'Ada Lovelace', href: '/contacts/42' });
    // Ancestors are untouched by the leaf overrides.
    expect(trail.map((c) => c.label)).toEqual(['Home', 'Social', 'Ada Lovelace']);
  });

  it('returns [] for an unknown current key (an unmapped route shows no crumbs)', () => {
    expect(buildBreadcrumbTrail(NODES, '/nope')).toEqual([]);
  });

  it('accepts an array of nodes (indexed by key)', () => {
    const trail = buildBreadcrumbTrail(Object.values(NODES), '/contacts');
    expect(trail.map((c) => c.label)).toEqual(['Home', 'Social', 'Contacts']);
  });

  it('is bounded against a cyclic parent map', () => {
    const cyclic: BreadcrumbNode[] = [
      { key: 'a', label: 'A', parent: 'b' },
      { key: 'b', label: 'B', parent: 'a' },
    ];
    // Should terminate (cycle detected) rather than loop forever.
    const trail = buildBreadcrumbTrail(cyclic, 'a');
    expect(trail.length).toBeLessThanOrEqual(2);
  });
});

const TRAIL = [
  { label: 'Home', href: '/' },
  { label: 'Social', href: '/people' },
  { label: 'Contacts', href: '/contacts' },
];

describe('Breadcrumbs', () => {
  it('renders an accessible <nav>/<ol> with each crumb', () => {
    const html = renderToStaticMarkup(<Breadcrumbs items={TRAIL} />);
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('<ol');
    expect(html).toContain('Home');
    expect(html).toContain('Social');
    expect(html).toContain('Contacts');
  });

  it('links every ancestor but marks the last crumb as the current page', () => {
    const html = renderToStaticMarkup(<Breadcrumbs items={TRAIL} />);
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/people"');
    // The leaf is current — non-interactive and aria-current, never a link.
    expect(html).not.toContain('href="/contacts"');
    expect(html).toContain('aria-current="page"');
  });

  it('renders nothing for an empty trail', () => {
    expect(renderToStaticMarkup(<Breadcrumbs items={[]} />)).toBe('');
  });

  it('uses the injected link component (a router Link gets `to`, not `href`)', () => {
    const FakeLink = ({ to, children }: { to: string; children: unknown }) => (
      <span data-to={to}>{children as never}</span>
    );
    const html = renderToStaticMarkup(<Breadcrumbs items={TRAIL} linkComponent={FakeLink} />);
    expect(html).toContain('data-to="/"');
    expect(html).toContain('data-to="/people"');
  });

  it('collapses an over-long middle into an ellipsis carrying the hidden labels', () => {
    const long = [
      { label: 'Home', href: '/' },
      { label: 'Social', href: '/people' },
      { label: 'Groups', href: '/groups' },
      { label: 'Team', href: '/groups/1' },
      { label: 'Member', href: '/groups/1/m/2' },
    ];
    const html = renderToStaticMarkup(<Breadcrumbs items={long} maxItems={3} collapseTail={1} />);
    expect(html).toContain('…');
    // Head + collapsed-tail survive; the folded labels surface in the ellipsis title.
    expect(html).toContain('Home');
    expect(html).toContain('Member');
    expect(html).toContain('title="Social › Groups › Team"');
  });

  it('lets an app fully restyle a slot via a function override', () => {
    const html = renderToStaticMarkup(<Breadcrumbs items={TRAIL} classNames={{ current: () => 'text-accent' }} />);
    expect(html).toContain('text-accent');
  });
});
