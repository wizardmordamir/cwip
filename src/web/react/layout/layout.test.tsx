import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LayoutField, LayoutNode } from '../../../core/layout';
import { LayoutRenderer } from './LayoutRenderer';
import { compatibleWidgets, isContainerType, widgetDef } from './registry';
import type { WidgetRegistry } from './types';

// A tiny app registry: a labeled value widget, a title, and a container section.
const WIDGETS: WidgetRegistry<LayoutField> = {
  keyValue: {
    type: 'keyValue',
    title: 'Field value',
    description: '',
    category: 'Field',
    acceptsBindingKinds: ['column'],
    labeled: true,
    render: (ctx) => <span>{String(ctx.resolved.kind === 'column' ? ctx.resolved.value : '')}</span>,
  },
  title: {
    type: 'title',
    title: 'Title',
    description: '',
    category: 'Field',
    acceptsBindingKinds: ['column'],
    acceptsColumnTypes: ['text'],
    render: (ctx) => <h2>{String(ctx.resolved.kind === 'column' ? ctx.resolved.value : '')}</h2>,
  },
  section: {
    type: 'section',
    title: 'Section',
    description: '',
    category: 'Layout',
    acceptsBindingKinds: ['static'],
    container: true,
    render: (ctx) => <div data-section>{ctx.children}</div>,
  },
};

const fields: LayoutField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
];

describe('cwip/react layout engine', () => {
  it('renders nodes through the injected registry, resolving columns + labels', () => {
    const nodes: LayoutNode[] = [
      { id: 't', type: 'title', binding: { kind: 'column', key: 'name' } },
      { id: 'r', type: 'keyValue', binding: { kind: 'column', key: 'role' } },
    ];
    const html = renderToStaticMarkup(
      <LayoutRenderer
        nodes={nodes}
        fields={fields}
        widgets={WIDGETS}
        surface="detail"
        row={{ name: 'Ada', role: 'Engineer' }}
      />,
    );
    expect(html).toContain('<h2>Ada</h2>'); // title widget
    expect(html).toContain('Engineer'); // keyValue value
    expect(html).toContain('Role'); // labeled widget shows the field label
  });

  it('drops a column node whose field was deleted, and renders containers', () => {
    const nodes: LayoutNode[] = [
      { id: 'gone', type: 'keyValue', binding: { kind: 'column', key: 'missing' } },
      {
        id: 's',
        type: 'section',
        binding: { kind: 'static' },
        children: [{ id: 'c', type: 'keyValue', binding: { kind: 'column', key: 'name' } }],
      },
    ];
    const html = renderToStaticMarkup(
      <LayoutRenderer nodes={nodes} fields={fields} widgets={WIDGETS} surface="page" row={{ name: 'Ada' }} />,
    );
    expect(html).toContain('data-section');
    expect(html).toContain('Ada'); // child column resolved inside the section
    expect(html).not.toContain('missing');
  });

  it('registry helpers: fallback, container flag, column-type gating', () => {
    expect(widgetDef(WIDGETS, 'nope')?.type).toBe('keyValue'); // falls back
    expect(isContainerType(WIDGETS, 'section')).toBe(true);
    expect(isContainerType(WIDGETS, 'keyValue')).toBe(false);
    // 'title' only accepts text columns; 'keyValue' accepts any.
    const forText = compatibleWidgets(WIDGETS, fields[0]).map((w) => w.type);
    expect(forText).toContain('title');
    expect(forText).toContain('keyValue');
    const forNumber = compatibleWidgets(WIDGETS, { key: 'n', label: 'N', type: 'number' }).map((w) => w.type);
    expect(forNumber).not.toContain('title');
    expect(forNumber).toContain('keyValue');
  });
});
