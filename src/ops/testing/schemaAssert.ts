import type { Options, Schema } from 'ajv';
import { type ValidationResult, validate } from '../../core/schema';

// Schema + deep-key assertions for functional tests, built on the existing
// `cwip/schema` validator (the optional ajv peer) — assert a
// response body's shape declaratively instead of cherry-picking fields.

/** Validate `obj` against a JSON Schema, returning `{ valid, data, errors }`. */
export const validateObjectBySchema = <T = unknown>(
  schema: Schema,
  obj: unknown,
  options?: Options,
): ValidationResult<T> => validate<T>(schema, obj, options);

/**
 * Assert `obj` matches `schema`, returning it typed as `T` (throws with the
 * normalized errors otherwise). Handy for `const user = expectMatchObjectBySchema(userSchema, res.body)`.
 */
export const expectMatchObjectBySchema = <T = unknown>(schema: Schema, obj: unknown, options?: Options): T => {
  const { valid, data, errors } = validate<T>(schema, obj, options);
  if (!valid) throw new Error(`object did not match schema: ${JSON.stringify(errors)}`);
  return data;
};

export type KeyPredicate = (value: unknown) => boolean;

/**
 * Assert each key of `obj` satisfies its predicate. By default no extra keys are
 * allowed, so `expectMatchObjectByKeys(res.body, { id: isString, age: isNumber })`
 * also fails if the body carries unexpected fields. Pass `{ allowExtraKeys: true }`
 * to only check the listed keys.
 */
export const expectMatchObjectByKeys = (
  obj: Record<string, unknown>,
  checks: Record<string, KeyPredicate>,
  options: { allowExtraKeys?: boolean } = {},
): void => {
  const target = obj ?? {};
  for (const [key, predicate] of Object.entries(checks)) {
    if (!predicate(target[key])) {
      throw new Error(`key "${key}" failed its predicate (value: ${JSON.stringify(target[key])})`);
    }
  }
  if (!options.allowExtraKeys) {
    const extra = Object.keys(target).filter((k) => !(k in checks));
    if (extra.length) throw new Error(`unexpected keys: ${extra.join(', ')}`);
  }
};
