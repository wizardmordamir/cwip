import { describe, expect, it } from 'bun:test';
import { compileSchema, createAjv, normalizeSchemaErrors, validate } from '.';

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
  required: ['name'],
  additionalProperties: false,
} as const;

describe('validate', () => {
  it('returns valid + coerced/cleaned data for good input', () => {
    const result = validate<{ name: string; age?: number }>(userSchema, { name: 'Ada', age: '36', extra: 'x' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual({ name: 'Ada', age: 36 }); // age coerced, extra stripped
  });

  it('returns normalized errors for bad input', () => {
    const result = validate(userSchema, { age: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { path: 'name', message: expect.any(String), keyword: 'required', params: { missingProperty: 'name' } },
    ]);
  });

  it('honors per-call options (e.g. keep unknown properties)', () => {
    const result = validate(userSchema, { name: 'Ada', extra: 'x' }, { removeAdditional: false });
    expect(result.valid).toBe(false); // additionalProperties:false now reports the extra key
  });
});

describe('compileSchema', () => {
  it('produces a reusable typed validator', () => {
    const isUser = compileSchema<{ name: string }>(userSchema);
    expect(isUser({ name: 'Bo' })).toBe(true);
    expect(isUser({ age: 1 })).toBe(false);
  });
});

describe('normalizeSchemaErrors', () => {
  it('flattens instancePath to a dotted path and points required at the property', () => {
    const ajv = createAjv();
    const v = ajv.compile({
      type: 'object',
      properties: { nested: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      required: ['nested'],
    });
    v({ nested: {} });
    expect(normalizeSchemaErrors(v.errors)).toEqual([
      { path: 'nested.id', message: expect.any(String), keyword: 'required', params: { missingProperty: 'id' } },
    ]);
  });

  it('returns [] for null/undefined', () => {
    expect(normalizeSchemaErrors(null)).toEqual([]);
  });
});
