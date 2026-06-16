import type { ErrorObject } from 'ajv';

/** A flattened, human-friendly schema validation error. */
export interface SchemaError {
  /** Dotted path to the offending value (`''` for the root), derived from `instancePath`. */
  path: string;
  /** Ajv's message (e.g. `must be string`). */
  message: string;
  /** The failed keyword (e.g. `required`, `type`, `format`). */
  keyword: string;
  /** Ajv's `params` for the failure (e.g. `{ missingProperty: 'name' }`). */
  params: Record<string, unknown>;
}

/**
 * Turn Ajv's raw `ErrorObject[]` into a flat, stable shape that's easy to render
 * or return in an API response — `instancePath` (`/a/0/b`) becomes a dotted path
 * (`a.0.b`), and missing-property errors point at the property itself. Pure (no
 * peer needed), so it's testable without ajv.
 */
export const normalizeSchemaErrors = (errors: ErrorObject[] | null | undefined): SchemaError[] => {
  if (!errors) {
    return [];
  }
  return errors.map((err) => {
    let path = err.instancePath.replace(/^\//, '').replace(/\//g, '.');
    // For `required`, point at the missing property rather than its parent.
    const missing = (err.params as { missingProperty?: string }).missingProperty;
    if (err.keyword === 'required' && missing) {
      path = path ? `${path}.${missing}` : missing;
    }
    return {
      path,
      message: err.message ?? 'is invalid',
      keyword: err.keyword,
      params: (err.params ?? {}) as Record<string, unknown>,
    };
  });
};
