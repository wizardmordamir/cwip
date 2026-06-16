import { computeAggregate } from './aggregate';
import type { LayoutField, LayoutRow } from './field';
import type { AggregateMetric, LayoutNode } from './types';

// The ambient data a node's binding resolves against. `fieldByKey` is the app's
// field/column metadata, keyed by column key; `row`/`rows` are the current record
// and the visible row set (for aggregates).
export type ResolveEnv<F extends LayoutField = LayoutField> = {
  fieldByKey: Map<string, F>;
  row?: LayoutRow;
  rows?: LayoutRow[];
};

// A node's binding resolved against the ambient row. A renderer reads values ONLY
// through this — it never assumes a `row` shape — which is what lets the same engine
// host aggregate and pinned data sources. `unresolved` covers a deleted column, an
// unmapped slot, or a binding kind this resolver doesn't handle.
export type ResolvedBinding<F extends LayoutField = LayoutField> =
  | { kind: 'column'; field: F; value: unknown }
  | { kind: 'aggregate'; value: number | null; metric: AggregateMetric; field?: F }
  | { kind: 'static' }
  | { kind: 'unresolved' };

// Resolve a node's binding against the ambient row/rows. Handles the engine's core
// kinds (column / aggregate / static); everything else (slot, pinned*, or an app's
// own kinds) returns `unresolved` here — an app composes its own resolver on top to
// handle those, falling back to this for the core kinds.
export const resolveBinding = <F extends LayoutField>(node: LayoutNode, env: ResolveEnv<F>): ResolvedBinding<F> => {
  const b = node.binding;
  switch (b.kind) {
    case 'column': {
      const field = env.fieldByKey.get(b.key);
      if (!field) return { kind: 'unresolved' };
      return { kind: 'column', field, value: env.row?.[b.key] };
    }
    case 'aggregate': {
      const field = b.key ? env.fieldByKey.get(b.key) : undefined;
      const value = computeAggregate(b.metric, b.key, env.rows ?? []);
      return { kind: 'aggregate', value, metric: b.metric, field };
    }
    case 'static':
      return { kind: 'static' };
    default:
      // slot (unmapped at render time) + pinned* + any app-specific kind
      return { kind: 'unresolved' };
  }
};
