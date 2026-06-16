import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DiscardConfirmOverlay,
  DragHandle,
  DropIndicator,
  InlineEditableText,
  Pagination,
  QueryBoundary,
  SegmentedControl,
} from '.';

describe('SegmentedControl', () => {
  it('marks the active option', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        value="b"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    // The active option (B) gets the themeable accent fill.
    expect(html).toContain('bg-accent');
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
  });
});

describe('Pagination', () => {
  it('renders a windowed range with ellipses for many pages', () => {
    const html = renderToStaticMarkup(<Pagination page={6} pageCount={20} onPageChange={() => {}} />);
    expect(html).toContain('aria-label="Page 1"');
    expect(html).toContain('aria-label="Page 20"');
    expect(html).toContain('…');
  });

  it('renders nothing for a single page with no size selector', () => {
    expect(renderToStaticMarkup(<Pagination page={1} pageCount={1} onPageChange={() => {}} />)).toBe('');
  });

  it('shows the range label when totals are known', () => {
    const html = renderToStaticMarkup(
      <Pagination page={2} pageCount={4} pageSize={10} total={35} onPageChange={() => {}} />,
    );
    expect(html).toContain('11–20 of 35');
  });
});

describe('InlineEditableText', () => {
  it('renders an edit button with the value when editable', () => {
    const html = renderToStaticMarkup(<InlineEditableText value="Hello" onSave={() => {}} />);
    expect(html).toContain('Hello');
    expect(html).toContain('Click to edit');
  });

  it('renders plain text (no button) when not editable', () => {
    const html = renderToStaticMarkup(<InlineEditableText value="ReadOnly" canEdit={false} onSave={() => {}} />);
    expect(html).toContain('ReadOnly');
    expect(html).not.toContain('<button');
  });
});

describe('QueryBoundary', () => {
  it('shows the skeleton while loading', () => {
    const html = renderToStaticMarkup(
      <QueryBoundary isLoading>
        <div>content</div>
      </QueryBoundary>,
    );
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('content');
  });

  it('shows the error fallback on error', () => {
    const html = renderToStaticMarkup(
      <QueryBoundary isError>
        <div>content</div>
      </QueryBoundary>,
    );
    expect(html).toContain('Something went wrong');
  });

  it('renders children when ready', () => {
    const html = renderToStaticMarkup(
      <QueryBoundary query={{ isLoading: false }}>
        <div>content</div>
      </QueryBoundary>,
    );
    expect(html).toContain('content');
  });
});

describe('drag helpers', () => {
  it('DragHandle spreads handle props and renders the grip', () => {
    const html = renderToStaticMarkup(<DragHandle handleProps={{ 'data-testid': 'h' }} />);
    expect(html).toContain('data-testid="h"');
    expect(html).toContain('aria-label="Drag to reorder"');
  });

  it('DropIndicator renders an accent line, overridable via color', () => {
    expect(renderToStaticMarkup(<DropIndicator orientation="horizontal" side="start" />)).toContain('bg-accent');
    expect(renderToStaticMarkup(<DropIndicator orientation="horizontal" side="start" color="#f00" />)).toContain(
      'background-color:#f00',
    );
  });
});

describe('DiscardConfirmOverlay', () => {
  it('shows Save only when onSave is given', () => {
    const without = renderToStaticMarkup(<DiscardConfirmOverlay onKeepEditing={() => {}} onDiscard={() => {}} />);
    expect(without).not.toContain('Save changes');
    const withSave = renderToStaticMarkup(
      <DiscardConfirmOverlay onKeepEditing={() => {}} onDiscard={() => {}} onSave={() => {}} />,
    );
    expect(withSave).toContain('Save changes');
  });
});
