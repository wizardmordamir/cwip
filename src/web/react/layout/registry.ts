import type { LayoutField, LayoutNode } from '../../../core/layout';
import type { LayoutWidgetDef, WidgetRegistry } from './types';

// Look up a widget def, falling back to the registry's `keyValue` entry (the type
// the migration coerces unknown nodes to). Returns undefined if neither exists.
export const widgetDef = <F extends LayoutField>(
  registry: WidgetRegistry<F>,
  type: string,
): LayoutWidgetDef<F> | undefined => registry[type] ?? registry.keyValue;

// Whether a node type is a container (renders children on a sub-grid).
export const isContainerType = <F extends LayoutField>(registry: WidgetRegistry<F>, type: string): boolean =>
  Boolean(registry[type]?.container);

// The widgets that can render a column of this type (drives the inspector's "Show
// as" picker). Widgets with no `acceptsColumnTypes` accept any column type.
export const compatibleWidgets = <F extends LayoutField>(
  registry: WidgetRegistry<F>,
  field?: F,
): LayoutWidgetDef<F>[] => {
  const t = field?.type;
  return Object.values(registry).filter(
    (w) =>
      w.acceptsBindingKinds.includes('column') && (!w.acceptsColumnTypes || (!!t && w.acceptsColumnTypes.includes(t))),
  );
};

// A short, reasonably-unique node id seeded by the widget type — used when an
// editor adds a node to the canvas.
export const newNodeId = (seed: string): string =>
  `${seed}-${
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`;

// Make a decoration node (heading/text/divider/spacer) — a `static` binding, no
// data. `content` seeds the editable text for heading/text.
export const makeElementNode = <F extends LayoutField>(
  registry: WidgetRegistry<F>,
  type: string,
  content?: string,
): LayoutNode => {
  const node: LayoutNode = {
    id: newNodeId(type),
    type,
    binding: { kind: 'static' },
    width: registry[type]?.defaultWidth ?? 'full',
  };
  if (content !== undefined) node.content = content;
  return node;
};

// Make a section container node (one level of nesting; holds child nodes).
export const makeSectionNode = (title = 'Section'): LayoutNode => ({
  id: newNodeId('section'),
  type: 'section',
  binding: { kind: 'static' },
  width: 'full',
  title,
  children: [],
});
