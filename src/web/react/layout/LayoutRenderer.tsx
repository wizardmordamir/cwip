import { useMemo } from 'react';
import {
  resolveBinding as coreResolveBinding,
  type LayoutField,
  type LayoutNode,
  type LayoutRow,
  type LayoutSurface,
  nodeBoxClass,
  nodeGridClass,
  nodeTextClass,
  type ResolvedBinding,
  type ResolveEnv,
} from '../../../core/layout';
import { isContainerType, widgetDef } from './registry';
import type { WidgetRegistry } from './types';

// Resolve a node's binding to a value. Defaults to the core column/aggregate/static
// resolver; an app supplies its own to add binding kinds (falling back to core).
export type BindingResolver<F extends LayoutField> = (node: LayoutNode, env: ResolveEnv<F>) => ResolvedBinding<F>;

type RenderCtx<F extends LayoutField> = {
  env: ResolveEnv<F>;
  surface: LayoutSurface;
  widgets: WidgetRegistry<F>;
  resolve: BindingResolver<F>;
  interactive: boolean;
  onPatchCell?: (key: string, value: unknown) => void;
};

const childGridClass = 'grid grid-cols-12 gap-x-4 gap-y-2';

// Render one node: resolve its binding, (recursively) its children, then hand a
// WidgetContext to the registered widget. The renderer owns grid placement, the
// style box/text classes, and the field label — widgets only draw their value.
function LayoutNodeView<F extends LayoutField>({ node, ctx }: { node: LayoutNode; ctx: RenderCtx<F> }) {
  const def = widgetDef(ctx.widgets, node.type);
  if (!def) return null;
  const resolved = ctx.resolve(node, ctx.env);
  const bindingKind = node.binding.kind;
  const isFieldBinding = bindingKind === 'column' || bindingKind === 'slot' || bindingKind === 'aggregate';

  // A field widget whose data can't be resolved (deleted column / unmapped slot /
  // unsupported source) is dropped — matches the old "skip missing column".
  if (isFieldBinding && resolved.kind === 'unresolved') return null;

  const field = resolved.kind === 'column' || resolved.kind === 'aggregate' ? resolved.field : undefined;

  const children =
    isContainerType(ctx.widgets, node.type) && node.children?.length ? (
      <div className={childGridClass}>
        {node.children.map((c) => (
          <LayoutNodeView key={c.id} node={c} ctx={ctx} />
        ))}
      </div>
    ) : undefined;

  const content = def.render({
    node,
    resolved,
    surface: ctx.surface,
    interactive: ctx.interactive,
    field,
    row: ctx.env.row,
    rows: ctx.env.rows,
    children,
    onPatchCell: ctx.onPatchCell,
  });

  const showLabel = Boolean(def.labeled && field && !node.hideLabel);

  return (
    <div className={`${nodeGridClass(node)} min-w-0 ${nodeBoxClass(node.style)}`.trim()}>
      {showLabel && field && (
        <div className="mb-0.5 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{field.label}</div>
      )}
      <div className={`min-w-0 break-words ${nodeTextClass(node.style)}`.trim()}>{content}</div>
    </div>
  );
}

export type LayoutRendererProps<F extends LayoutField = LayoutField> = {
  nodes: LayoutNode[];
  fields: F[];
  surface: LayoutSurface;
  widgets: WidgetRegistry<F>;
  row?: LayoutRow; // the record a card/detail renders
  rows?: LayoutRow[]; // the visible set aggregate widgets fold over
  // Resolve a node's binding; defaults to the core resolver (column/aggregate/
  // static). Supply your own to add app-specific binding kinds.
  resolve?: BindingResolver<F>;
  // Whether interactive widgets are live; defaults to the detail surface.
  interactive?: boolean;
  onPatchCell?: (key: string, value: unknown) => void;
  className?: string;
};

// Render an ordered list of layout nodes onto the responsive 12-col grid. Generic
// over the app's field type; the app supplies the widget registry (and optionally a
// custom binding resolver).
export function LayoutRenderer<F extends LayoutField = LayoutField>({
  nodes,
  fields,
  surface,
  widgets,
  row,
  rows,
  resolve,
  interactive,
  onPatchCell,
  className,
}: LayoutRendererProps<F>) {
  const fieldByKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const ctx: RenderCtx<F> = {
    env: { fieldByKey, row, rows },
    surface,
    widgets,
    resolve: resolve ?? (coreResolveBinding as BindingResolver<F>),
    interactive: interactive ?? surface === 'detail',
    onPatchCell,
  };
  const gapY = surface === 'card' ? 'gap-y-2' : 'gap-y-3';
  return (
    <div className={className ?? `grid grid-cols-12 gap-x-4 ${gapY}`}>
      {nodes.map((node) => (
        <LayoutNodeView key={node.id} node={node} ctx={ctx} />
      ))}
    </div>
  );
}
