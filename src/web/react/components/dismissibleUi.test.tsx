import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddItemsMenu, DismissButton, JsonEditor } from '.';

describe('DismissButton', () => {
  it('renders an icon-only button with an accessible label and default ✕', () => {
    const html = renderToStaticMarkup(<DismissButton label="Hide Budgets" onClick={() => {}} />);
    expect(html).toContain('aria-label="Hide Budgets"');
    expect(html).toContain('title="Hide Budgets"');
    expect(html).toContain('✕');
  });

  it('uses a custom icon when provided', () => {
    const html = renderToStaticMarkup(
      <DismissButton label="Remove" icon={<svg data-x="close" />} onClick={() => {}} />,
    );
    expect(html).toContain('data-x="close"');
    expect(html).not.toContain('✕');
  });
});

describe('AddItemsMenu', () => {
  it('renders a trigger with the label and count', () => {
    const html = renderToStaticMarkup(
      <AddItemsMenu
        label="Add section"
        showCount
        items={[{ id: 'a' }, { id: 'b' }]}
        itemKey={(i) => i.id}
        itemLabel={(i) => i.id}
        onAdd={() => {}}
      />,
    );
    expect(html).toContain('Add section');
    expect(html).toContain('(2)');
  });

  it('marks the trigger as a collapsed popover for assistive tech', () => {
    const html = renderToStaticMarkup(
      <AddItemsMenu label="Add" items={[{ id: 'a' }]} itemKey={(i) => i.id} itemLabel={(i) => i.id} onAdd={() => {}} />,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe('JsonEditor', () => {
  it('shows a valid status for parseable input', () => {
    const html = renderToStaticMarkup(<JsonEditor value={'{ a: 1 }'} onChange={() => {}} />);
    expect(html).toContain('✓ Valid');
    expect(html).toContain('Format JSON');
  });

  it('shows an error status with the parse message for bad input', () => {
    const html = renderToStaticMarkup(<JsonEditor value={'{ a: }'} onChange={() => {}} />);
    expect(html).toContain('✕');
  });

  it('treats empty input as Empty (not an error)', () => {
    const html = renderToStaticMarkup(<JsonEditor value={'   '} onChange={() => {}} />);
    expect(html).toContain('Empty');
  });
});
