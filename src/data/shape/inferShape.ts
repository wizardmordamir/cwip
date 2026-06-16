import type { ShapeField, ShapeNode } from './types';

// A stable structural signature used to dedupe union members.
const signature = (n: ShapeNode): string => {
  switch (n.kind) {
    case 'array':
      return `array<${signature(n.element)}>`;
    case 'object':
      return `object{${n.fields
        .map((f) => `${f.key}${f.optional ? '?' : ''}:${signature(f.shape)}`)
        .sort()
        .join(',')}}`;
    case 'union':
      return `union(${n.options.map(signature).sort().join('|')})`;
    default:
      return n.kind;
  }
};

const flattenUnion = (n: ShapeNode): ShapeNode[] => (n.kind === 'union' ? n.options : [n]);

const unionOf = (nodes: ShapeNode[]): ShapeNode => {
  const seen = new Map<string, ShapeNode>();
  for (const n of nodes.flatMap(flattenUnion)) {
    if (n.kind === 'unknown') continue;
    const sig = signature(n);
    if (!seen.has(sig)) seen.set(sig, n);
  }
  const options = [...seen.values()];
  if (options.length === 0) return { kind: 'unknown' };
  if (options.length === 1) return options[0];
  return { kind: 'union', options };
};

const mergeObjects = (
  a: Extract<ShapeNode, { kind: 'object' }>,
  b: Extract<ShapeNode, { kind: 'object' }>,
): ShapeNode => {
  const aByKey = new Map(a.fields.map((f) => [f.key, f]));
  const bByKey = new Map(b.fields.map((f) => [f.key, f]));
  const keys = [...new Set([...aByKey.keys(), ...bByKey.keys()])];
  const fields: ShapeField[] = keys.map((key) => {
    const fa = aByKey.get(key);
    const fb = bByKey.get(key);
    if (fa && fb) return { key, shape: mergeShape(fa.shape, fb.shape), optional: fa.optional || fb.optional };
    const present = (fa ?? fb) as ShapeField;
    // missing in one side → optional
    return { key, shape: present.shape, optional: true };
  });
  return { kind: 'object', fields };
};

/** Merge two shapes into one that describes both (object fields union; else a union). */
export const mergeShape = (a: ShapeNode, b: ShapeNode): ShapeNode => {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === 'object' && b.kind === 'object') return mergeObjects(a, b);
  if (a.kind === 'array' && b.kind === 'array') return { kind: 'array', element: mergeShape(a.element, b.element) };
  if (a.kind === b.kind && a.kind !== 'union') return a;
  return unionOf([a, b]);
};

/**
 * Infer the structural shape of a value. Arrays merge all their elements into one
 * element shape (so an array of row objects yields the unified row shape, with
 * keys present in only some rows marked optional). `null` becomes part of a union
 * (`X | null`) when it coexists with other types.
 */
export const inferShape = (value: unknown): ShapeNode => {
  if (value === null) return { kind: 'null' };
  if (value === undefined) return { kind: 'unknown' };
  if (value instanceof Date) return { kind: 'date' };
  if (Array.isArray(value)) {
    const element = value.map(inferShape).reduce(mergeShape, { kind: 'unknown' } as ShapeNode);
    return { kind: 'array', element };
  }
  const t = typeof value;
  if (t === 'string') return { kind: 'string' };
  if (t === 'number' || t === 'bigint') return { kind: 'number' };
  if (t === 'boolean') return { kind: 'boolean' };
  if (t === 'object') {
    const fields: ShapeField[] = Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
      key,
      shape: inferShape(v),
      optional: v === undefined,
    }));
    return { kind: 'object', fields };
  }
  return { kind: 'unknown' };
};

/**
 * Infer the unified shape of a set of homogeneous samples (e.g. a query's result
 * rows), returning the merged element shape directly — the "response row type".
 */
export const inferRowShape = (rows: unknown[]): ShapeNode =>
  rows.map(inferShape).reduce(mergeShape, { kind: 'unknown' } as ShapeNode);
