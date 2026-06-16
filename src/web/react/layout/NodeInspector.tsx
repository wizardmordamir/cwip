import type { ReactNode } from 'react';
import type { LayoutField, LayoutNode, LayoutWidth, NodeStyle } from '../../../core/layout';
import { compatibleWidgets } from './registry';
import type { WidgetRegistry } from './types';

// The settings panel for the selected node: how it binds, how it's shown, its grid
// size, and its visual style. Styling is enumerated tokens only (safe Tailwind).
// Generic over the app's field type; the app supplies the widget registry (its
// "Show as" options derive from it).

export type NodeInspectorProps<F extends LayoutField = LayoutField> = {
  node: LayoutNode;
  fields: F[];
  widgets: WidgetRegistry<F>;
  sections: LayoutNode[];
  currentContainerId: string | null;
  onMove: (containerId: string | null) => void;
  onChange: (patch: Partial<LayoutNode>) => void;
};

// A self-contained themeable field class (the engine doesn't depend on a host kit).
const selectClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

const WIDTHS: { value: LayoutWidth; label: string }[] = [
  { value: 'full', label: 'Full width' },
  { value: 'half', label: 'Half (½)' },
  { value: 'third', label: 'Third (⅓)' },
  { value: 'quarter', label: 'Quarter (¼)' },
];

// option lists for the style tokens ('' = inherit/none)
const TONES = ['', 'neutral', 'emerald', 'sky', 'cyan', 'amber', 'purple', 'rose', 'slate'];
const FILLS = ['', 'subtle', 'toned', 'solid', 'card'];
const BORDERS = ['', 'hairline', 'toned', 'strong'];
const RADII = ['', 'none', 'sm', 'md', 'lg', 'full'];
const PADDINGS = ['', 'none', 'tight', 'cozy', 'roomy'];
const ALIGNS = ['', 'left', 'center', 'right'];
const SIZES = ['', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'];
const WEIGHTS = ['', 'normal', 'medium', 'semibold', 'bold'];
const TEXT_COLORS = ['', 'default', 'muted', 'subtle', 'tone'];

const AGG_METRICS: { value: string; label: string }[] = [
  { value: 'count', label: 'Count of rows' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Lowest' },
  { value: 'max', label: 'Highest' },
  { value: 'countTrue', label: 'Count where true' },
  { value: 'distinctCount', label: 'Distinct values' },
  { value: 'progress', label: 'Progress (done / total)' },
];

const Labeled = ({ label, children }: { label: string; children: ReactNode }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: `children` is the associated control (a select/input); the label wraps it for click-to-focus.
  <label className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium text-gray-400">{label}</span>
    {children}
  </label>
);

const StyleSelect = ({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onPick: (v: string | undefined) => void;
}) => (
  <Labeled label={label}>
    <select className={selectClass} value={value ?? ''} onChange={(e) => onPick(e.target.value || undefined)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o || '—'}
        </option>
      ))}
    </select>
  </Labeled>
);

export function NodeInspector<F extends LayoutField = LayoutField>({
  node,
  fields,
  widgets,
  sections,
  currentContainerId,
  onMove,
  onChange,
}: NodeInspectorProps<F>) {
  const isColumn = node.binding.kind === 'column';
  const boundKey = node.binding.kind === 'column' ? node.binding.key : undefined;
  const field = fields.find((f) => f.key === boundKey);
  const isDecoration = node.binding.kind === 'static';
  const isSection = node.type === 'section';
  const isAggregate = node.binding.kind === 'aggregate';
  const aggMetric = node.binding.kind === 'aggregate' ? node.binding.metric : 'count';
  const aggKey = node.binding.kind === 'aggregate' ? node.binding.key : undefined;

  const setStyle = (patch: Partial<NodeStyle>) => onChange({ style: { ...(node.style ?? {}), ...patch } });
  const setAgg = (patch: { metric?: string; key?: string }) =>
    onChange({
      binding: {
        kind: 'aggregate',
        metric: (patch.metric ?? aggMetric) as typeof aggMetric,
        key: 'key' in patch ? patch.key : aggKey,
      },
    });

  return (
    <div className="flex flex-col gap-3">
      {/* binding / widget */}
      {isColumn && (
        <>
          <Labeled label="Field">
            <select
              className={selectClass}
              value={boundKey ?? ''}
              onChange={(e) => onChange({ binding: { kind: 'column', key: e.target.value } })}
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Show as">
            <select className={selectClass} value={node.type} onChange={(e) => onChange({ type: e.target.value })}>
              {compatibleWidgets(widgets, field).map((w) => (
                <option key={w.type} value={w.type}>
                  {w.title}
                </option>
              ))}
            </select>
          </Labeled>
        </>
      )}

      {isAggregate && (
        <>
          <Labeled label="Metric">
            <select className={selectClass} value={aggMetric} onChange={(e) => setAgg({ metric: e.target.value })}>
              {AGG_METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Labeled>
          {aggMetric !== 'count' && (
            <Labeled label="Column">
              <select
                className={selectClass}
                value={aggKey ?? ''}
                onChange={(e) => setAgg({ key: e.target.value || undefined })}
              >
                <option value="">Pick a column…</option>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Labeled>
          )}
          {node.type === 'kpi' && (
            <Labeled label="Label (optional)">
              <input
                className={selectClass}
                placeholder="Auto from the metric"
                value={(node.config?.label as string) ?? ''}
                onChange={(e) => onChange({ config: { ...node.config, label: e.target.value || undefined } })}
              />
            </Labeled>
          )}
        </>
      )}

      {isSection && (
        <Labeled label="Section title">
          <input
            className={selectClass}
            placeholder="Section"
            value={node.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Labeled>
      )}

      {isDecoration && (node.type === 'heading' || node.type === 'text') && (
        <Labeled label="Text">
          <input
            className={selectClass}
            value={node.content ?? ''}
            onChange={(e) => onChange({ content: e.target.value })}
          />
        </Labeled>
      )}

      {/* Move a (non-section) node between the top level and a section. */}
      {!isSection && sections.length > 0 && (
        <Labeled label="Container">
          <select
            className={selectClass}
            value={currentContainerId ?? ''}
            onChange={(e) => onMove(e.target.value || null)}
          >
            <option value="">Top level</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title || 'Section'}
              </option>
            ))}
          </select>
        </Labeled>
      )}

      {/* size */}
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Width">
          <select
            className={selectClass}
            value={node.width ?? 'full'}
            onChange={(e) => onChange({ width: e.target.value as LayoutWidth })}
          >
            {WIDTHS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Row height">
          <select
            className={selectClass}
            value={String(node.rowSpan ?? 1)}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ rowSpan: n === 1 ? undefined : (n as 2 | 3) });
            }}
          >
            <option value="1">1 row</option>
            <option value="2">2 rows</option>
            <option value="3">3 rows</option>
          </select>
        </Labeled>
      </div>

      {isColumn && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(node.hideLabel)}
            onChange={(e) => onChange({ hideLabel: e.target.checked || undefined })}
          />
          Hide the field label
        </label>
      )}

      {/* style */}
      <div className="mt-1 border-t border-gray-100 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
        Style
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StyleSelect
          label="Accent"
          value={node.style?.tone}
          options={TONES}
          onPick={(v) => setStyle({ tone: v as NodeStyle['tone'] })}
        />
        <StyleSelect
          label="Background"
          value={node.style?.fill}
          options={FILLS}
          onPick={(v) => setStyle({ fill: v as NodeStyle['fill'] })}
        />
        <StyleSelect
          label="Border"
          value={node.style?.border}
          options={BORDERS}
          onPick={(v) => setStyle({ border: v as NodeStyle['border'] })}
        />
        <StyleSelect
          label="Corners"
          value={node.style?.radius}
          options={RADII}
          onPick={(v) => setStyle({ radius: v as NodeStyle['radius'] })}
        />
        <StyleSelect
          label="Padding"
          value={node.style?.padding}
          options={PADDINGS}
          onPick={(v) => setStyle({ padding: v as NodeStyle['padding'] })}
        />
        <StyleSelect
          label="Align"
          value={node.style?.align}
          options={ALIGNS}
          onPick={(v) => setStyle({ align: v as NodeStyle['align'] })}
        />
        <StyleSelect
          label="Text size"
          value={node.style?.textSize}
          options={SIZES}
          onPick={(v) => setStyle({ textSize: v as NodeStyle['textSize'] })}
        />
        <StyleSelect
          label="Weight"
          value={node.style?.weight}
          options={WEIGHTS}
          onPick={(v) => setStyle({ weight: v as NodeStyle['weight'] })}
        />
        <StyleSelect
          label="Text color"
          value={node.style?.textColor}
          options={TEXT_COLORS}
          onPick={(v) => setStyle({ textColor: v as NodeStyle['textColor'] })}
        />
      </div>

      {isColumn && (
        <Labeled label="Empty fallback">
          <input
            className={selectClass}
            placeholder="Shown when the value is empty"
            value={node.emptyFallback ?? ''}
            onChange={(e) => onChange({ emptyFallback: e.target.value || undefined })}
          />
        </Labeled>
      )}
    </div>
  );
}
