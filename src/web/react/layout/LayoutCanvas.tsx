import { type ReactNode, useMemo } from 'react';
import {
  resolveBinding as coreResolveBinding,
  type LayoutField,
  type LayoutNode,
  type LayoutRow,
  type LayoutSurface,
  nodeGridClass,
  type ResolveEnv,
} from '../../../core/layout';
import { DismissButton } from '../components/DismissButton';
import { DragHandle } from '../components/DragHandle';
import { DropIndicator } from '../components/DropIndicator';
import { useDragReorder } from '../hooks/useDragReorder';
import type { BindingResolver } from './LayoutRenderer';
import { widgetDef } from './registry';
import type { WidgetRegistry } from './types';

type Shared<F extends LayoutField> = {
  fieldByKey: Map<string, F>;
  sampleRow: LayoutRow;
  sampleRows: LayoutRow[];
  surface: LayoutSurface;
  widgets: WidgetRegistry<F>;
  resolve: BindingResolver<F>;
  // Icon for the per-node remove control (the app supplies its own glyph).
  removeIcon?: ReactNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[], containerId: string | null) => void;
};

// One node on the editor canvas: a selectable, draggable frame previewing the
// widget on a sample row (display-only) with a grab handle + remove control.
function NodeFrame<F extends LayoutField>({
  node,
  shared,
  handleProps,
}: {
  node: LayoutNode;
  shared: Shared<F>;
  handleProps: Record<string, unknown>;
}) {
  const def = widgetDef(shared.widgets, node.type);
  const resolved = shared.resolve(node, {
    fieldByKey: shared.fieldByKey,
    row: shared.sampleRow,
    rows: shared.sampleRows,
  } as ResolveEnv<F>);
  const field = resolved.kind === 'column' || resolved.kind === 'aggregate' ? resolved.field : undefined;
  const missing = node.binding.kind === 'column' && resolved.kind === 'unresolved';
  const selected = shared.selectedId === node.id;
  const showLabel = Boolean(def?.labeled && field && !node.hideLabel);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <button> can't legally contain the drag handle + remove button; div+role is the accessible fallback (tabIndex + Enter handled).
    <div
      onClick={(e) => {
        e.stopPropagation();
        shared.onSelect(node.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') shared.onSelect(node.id);
      }}
      role="button"
      tabIndex={0}
      className={`group relative cursor-pointer rounded-lg border p-2 text-left transition ${
        selected
          ? 'border-sky-500 ring-1 ring-sky-500'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-gray-400">
          <DragHandle handleProps={handleProps} />
          <span className="truncate">{field?.label ?? def?.title ?? node.type}</span>
        </span>
        <DismissButton
          label="Remove widget"
          icon={shared.removeIcon}
          className="shrink-0 opacity-0 transition group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            shared.onRemove(node.id);
          }}
        />
      </div>
      {missing ? (
        <span className="text-xs text-rose-500">Column removed — delete this widget</span>
      ) : (
        <>
          {showLabel && field && (
            <div className="mb-0.5 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{field.label}</div>
          )}
          <div className="min-w-0 break-words">
            {def?.render({
              node,
              resolved,
              surface: shared.surface,
              interactive: false,
              field,
              row: shared.sampleRow,
              rows: shared.sampleRows,
            })}
          </div>
        </>
      )}
    </div>
  );
}

// A section on the canvas: its own chrome + a nested NodeList for its children.
function SectionFrame<F extends LayoutField>({
  node,
  shared,
  handleProps,
}: {
  node: LayoutNode;
  shared: Shared<F>;
  handleProps: Record<string, unknown>;
}) {
  const selected = shared.selectedId === node.id;
  return (
    // biome-ignore lint/a11y/useSemanticElements: contains a drag handle + nested controls, so it can't be a <button>.
    <div
      role="button"
      tabIndex={0}
      aria-label={node.title ? `Layout section ${node.title}` : 'Layout section'}
      onClick={(e) => {
        e.stopPropagation();
        shared.onSelect(node.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') shared.onSelect(node.id);
      }}
      className={`rounded-lg border p-2 text-left transition ${
        selected ? 'border-sky-500 ring-1 ring-sky-500' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-gray-400">
        <DragHandle handleProps={handleProps} />
        <span className="uppercase tracking-wide">Section</span>
        {node.title && <span className="truncate text-gray-500">· {node.title}</span>}
        <DismissButton
          label="Remove section"
          icon={shared.removeIcon}
          className="ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            shared.onRemove(node.id);
          }}
        />
      </div>
      {node.children?.length ? (
        <NodeList nodes={node.children} containerId={node.id} shared={shared} />
      ) : (
        <div className="rounded border border-dashed border-gray-300 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
          Select this section, then “Add widget” to put fields inside it.
        </div>
      )}
    </div>
  );
}

// One level of nodes, drag-reorderable among themselves (its own container id).
function NodeList<F extends LayoutField>({
  nodes,
  containerId,
  shared,
}: {
  nodes: LayoutNode[];
  containerId: string | null;
  shared: Shared<F>;
}) {
  const { containerProps, getItemProps, getHandleProps } = useDragReorder({
    ids: nodes.map((n) => n.id),
    onReorder: (ids) => shared.onReorder(ids, containerId),
    axis: 'x',
  });
  return (
    <div {...containerProps} className="grid grid-cols-12 gap-3">
      {nodes.map((node) => {
        const { 'data-drag-id': dragId, style, onClickCapture, insertBefore, insertAfter } = getItemProps(node.id);
        return (
          <div
            key={node.id}
            data-drag-id={dragId}
            style={style}
            onClickCapture={onClickCapture}
            className={`relative ${nodeGridClass(node)}`}
          >
            {insertBefore && <DropIndicator orientation="vertical" side="start" />}
            {insertAfter && <DropIndicator orientation="vertical" side="end" />}
            {node.type === 'section' ? (
              <SectionFrame node={node} shared={shared} handleProps={getHandleProps(node.id)} />
            ) : (
              <NodeFrame node={node} shared={shared} handleProps={getHandleProps(node.id)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type LayoutCanvasProps<F extends LayoutField = LayoutField> = {
  nodes: LayoutNode[];
  fields: F[];
  sampleRow: LayoutRow;
  sampleRows: LayoutRow[];
  surface: LayoutSurface;
  widgets: WidgetRegistry<F>;
  resolve?: BindingResolver<F>;
  removeIcon?: ReactNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[], containerId: string | null) => void;
  emptyHint?: ReactNode;
};

// The WYSIWYG editing surface: nodes on the real 12-col grid, each a draggable,
// selectable frame; sections nest a sub-grid. Drag reorders within a level; click
// selects (→ inspector). Cross-level moves are made from the inspector. Generic
// over the app's field type; the app supplies the widget registry.
export function LayoutCanvas<F extends LayoutField = LayoutField>({
  nodes,
  fields,
  sampleRow,
  sampleRows,
  surface,
  widgets,
  resolve,
  removeIcon,
  selectedId,
  onSelect,
  onRemove,
  onReorder,
  emptyHint,
}: LayoutCanvasProps<F>) {
  const fieldByKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">
        {emptyHint ?? 'Add fields and elements to design this view.'}
      </div>
    );
  }

  const shared: Shared<F> = {
    fieldByKey,
    sampleRow,
    sampleRows,
    surface,
    widgets,
    resolve: resolve ?? (coreResolveBinding as BindingResolver<F>),
    removeIcon,
    selectedId,
    onSelect,
    onRemove,
    onReorder,
  };
  return <NodeList nodes={nodes} containerId={null} shared={shared} />;
}
