import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge, Card, EmptyState, Page, PageContainer, Section, SectionHeading, Skeleton, SkeletonList } from '.';

describe('Badge', () => {
  it('applies the tone classes', () => {
    expect(renderToStaticMarkup(<Badge tone="emerald">New</Badge>)).toContain('bg-emerald-100');
  });
});

describe('Card', () => {
  it('renders a div by default with the surface classes', () => {
    const html = renderToStaticMarkup(<Card>body</Card>);
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('body');
  });

  it('renders an anchor when `to` is set', () => {
    expect(renderToStaticMarkup(<Card to="/x">y</Card>)).toContain('href="/x"');
  });

  it('paints an accent bar + tint when accentColor is set', () => {
    const html = renderToStaticMarkup(<Card accentColor="#3b82f6">z</Card>);
    expect(html).toContain('#3b82f6');
    expect(html).toContain('overflow-hidden');
  });
});

describe('layout shells', () => {
  it('Page carries the app surface classes', () => {
    expect(renderToStaticMarkup(<Page>x</Page>)).toContain('min-h-full');
  });

  it('PageContainer applies the size max-width', () => {
    expect(renderToStaticMarkup(<PageContainer size="narrow">x</PageContainer>)).toContain('max-w-3xl');
  });

  it('Section applies spacing + border + muted', () => {
    const html = renderToStaticMarkup(
      <Section spacing="hero" bordered="top" muted>
        x
      </Section>,
    );
    expect(html).toContain('py-20');
    expect(html).toContain('border-t');
    expect(html).toContain('bg-gray-50');
  });

  it('SectionHeading renders the title + action', () => {
    const html = renderToStaticMarkup(<SectionHeading action={<a href="/all">all</a>}>Title</SectionHeading>);
    expect(html).toContain('Title');
    expect(html).toContain('href="/all"');
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Nothing" description="add one" action={<button type="button">Add</button>} />,
    );
    expect(html).toContain('Nothing');
    expect(html).toContain('add one');
    expect(html).toContain('Add');
  });
});

describe('Skeleton', () => {
  it('applies pixel sizing from numbers', () => {
    expect(renderToStaticMarkup(<Skeleton width={120} height={16} />)).toContain('width:120px');
  });

  it('SkeletonList renders the requested number of rows', () => {
    const html = renderToStaticMarkup(<SkeletonList rows={3} />);
    expect(html.match(/animate-pulse/g)?.length).toBe(3);
  });
});
