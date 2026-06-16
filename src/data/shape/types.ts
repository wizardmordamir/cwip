// cwip/shape — structural shape inference. Given one value or many samples (e.g.
// the rows a query returned, or parsed JSON/CSV), derive a `ShapeNode` describing
// the data's structure: types, optional/nullable fields, array element shapes,
// nested objects, unions. Pure + browser-safe. It's the shared foundation under
// "capture real data → mock it → generate TypeScript types": the db-mock fixtures
// store input/output samples, and a JSON/CSV→TS tool turns these shapes into types.

export type ShapeNode =
  | { kind: 'unknown' }
  | { kind: 'null' }
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'array'; element: ShapeNode }
  | { kind: 'object'; fields: ShapeField[] }
  | { kind: 'union'; options: ShapeNode[] };

export interface ShapeField {
  key: string;
  shape: ShapeNode;
  /** True when the key is absent in at least one sample. */
  optional: boolean;
}
