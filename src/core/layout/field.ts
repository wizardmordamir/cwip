// The generic field/column contract the layout engine reads through. An app's own
// richer field type (e.g. cursedalchemy's `DataField`) structurally satisfies this,
// and the engine stays generic over the concrete field type (`F extends LayoutField`)
// so the app keeps its full field type inside widget render functions.
export type LayoutField = {
  key: string;
  label: string;
  type?: string; // app's column type, as a free string (no fixed union here)
  options?: Array<string | { value: string; label: string }>;
  config?: Record<string, unknown>;
};

// A generic row the engine reads ONLY through the binding resolver — never an
// app-specific row shape — so the same engine can host different data sources.
export type LayoutRow = Record<string, any> & { id?: string | number };
