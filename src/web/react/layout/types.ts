import type { ReactNode } from 'react';
import type {
  LayoutBinding,
  LayoutField,
  LayoutNode,
  LayoutRow,
  LayoutSurface,
  LayoutWidth,
  ResolvedBinding,
} from '../../../core/layout';

// The React widget contract for the layout engine. The pure model + binding
// resolution live in `cwip/layout`; this adds the rendering side. Everything is
// generic over the app's field type `F` (which must extend `LayoutField`), so an
// app keeps its full column type inside `render`.

export type WidgetCategory = 'Field' | 'Decoration' | 'Aggregate' | 'Layout';

// What a widget's `render` receives: the node, its resolved binding, the surface,
// the ambient row/rows, and (for container widgets) the pre-rendered child grid.
export type WidgetContext<F extends LayoutField = LayoutField> = {
  node: LayoutNode;
  resolved: ResolvedBinding<F>;
  surface: LayoutSurface;
  // When false (editor preview, card list) interactive widgets render display-only.
  interactive: boolean;
  field?: F; // present for column/aggregate bindings
  row?: LayoutRow;
  rows?: LayoutRow[];
  // Pre-rendered child grid for container widgets (section/group).
  children?: ReactNode;
  // Optimistic cell write for interactive widgets (toggle); wired by the host.
  onPatchCell?: (key: string, value: unknown) => void;
};

// A widget registry entry: how to render it, what it binds to (palette gating), and
// whether the renderer should show the field label above it.
export type LayoutWidgetDef<F extends LayoutField = LayoutField> = {
  type: string;
  title: string;
  description: string;
  icon?: ReactNode;
  category: WidgetCategory;
  defaultWidth?: LayoutWidth;
  // Which binding kinds this widget accepts (palette/inspector gating).
  acceptsBindingKinds: LayoutBinding['kind'][];
  // Column types this widget suits; omitted = any. Used to gate the palette.
  acceptsColumnTypes?: string[];
  // Per-column-type display variants offered in the inspector.
  variants?: (columnType?: string) => { value: string; label: string }[];
  // The renderer draws the field label above the widget (respecting node.hideLabel).
  labeled?: boolean;
  // Reads/writes a cell (must stopPropagation in a clickable card).
  interactive?: boolean;
  // A container widget (e.g. section/group) that lays its children out on a sub-grid.
  container?: boolean;
  render: (ctx: WidgetContext<F>) => ReactNode;
};

// An app's widget palette: a map of widget `type` → definition. The app owns this
// (it encodes the app's column types + how each renders); the engine reads through
// it. Conventionally includes a `keyValue` entry as the default fallback widget.
export type WidgetRegistry<F extends LayoutField = LayoutField> = Record<string, LayoutWidgetDef<F>>;
