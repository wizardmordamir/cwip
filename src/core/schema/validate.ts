import type { Options, Schema, ValidateFunction } from 'ajv';
import { type Ajv, createAjv, getAjv } from './createAjv';
import { normalizeSchemaErrors, type SchemaError } from './normalizeSchemaErrors';

/**
 * Compile a JSON Schema into a reusable, typed Ajv validator. Compiled validators
 * are cached on the shared Ajv instance, so compiling the same schema object is
 * cheap. Pass a custom `ajv` (from `createAjv`) for non-default options.
 *
 *   const validateUser = compileSchema<User>(userSchema);
 *   if (!validateUser(input)) console.log(validateUser.errors);
 */
export const compileSchema = <T = unknown>(schema: Schema, ajv: Ajv = getAjv()): ValidateFunction<T> =>
  ajv.compile<T>(schema);

/** The outcome of validating data against a schema. */
export interface ValidationResult<T> {
  valid: boolean;
  /**
   * The validated data. With the default options Ajv mutates the input in place
   * (type coercion, default-filling, stripping unknown keys), so this reflects
   * those transformations.
   */
  data: T;
  /** Normalized errors (empty when `valid`). */
  errors: SchemaError[];
}

/**
 * Validate `data` against `schema`, returning a normalized result rather than a
 * bare boolean: `{ valid, data, errors }`. The framework-agnostic core — the
 * express middleware wrapper lives in `cwip/server`.
 *
 *   const { valid, data, errors } = validate<User>(userSchema, req.body);
 *   if (!valid) return res.status(400).json({ errors });
 */
export const validate = <T = unknown>(schema: Schema, data: unknown, options?: Options): ValidationResult<T> => {
  const validateFn = compileSchema<T>(schema, options ? createAjv(options) : getAjv());
  const valid = validateFn(data);
  return { valid, data: data as T, errors: valid ? [] : normalizeSchemaErrors(validateFn.errors) };
};
