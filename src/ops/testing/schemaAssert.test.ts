import { describe, expect, it } from 'bun:test';
import { expectMatchObjectByKeys, expectMatchObjectBySchema, validateObjectBySchema } from './schemaAssert';

const userSchema = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { type: 'number' }, name: { type: 'string' } },
  additionalProperties: false,
} as const;

describe('schema assertions', () => {
  it('validateObjectBySchema returns valid/errors', () => {
    expect(validateObjectBySchema(userSchema, { id: 1, name: 'a' }).valid).toBe(true);
    const bad = validateObjectBySchema(userSchema, { id: 'x' });
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('expectMatchObjectBySchema returns the typed object or throws', () => {
    const u = expectMatchObjectBySchema<{ id: number; name: string }>(userSchema, { id: 1, name: 'a' });
    expect(u.id).toBe(1);
    expect(() => expectMatchObjectBySchema(userSchema, { id: 'x' })).toThrow(/did not match schema/);
  });
});

describe('expectMatchObjectByKeys', () => {
  const isString = (v: unknown) => typeof v === 'string';
  const isNumber = (v: unknown) => typeof v === 'number';

  it('passes when each predicate holds and no extra keys', () => {
    expect(() => expectMatchObjectByKeys({ id: 1, name: 'a' }, { id: isNumber, name: isString })).not.toThrow();
  });

  it('throws on a failed predicate', () => {
    expect(() => expectMatchObjectByKeys({ id: 'x' }, { id: isNumber })).toThrow(/failed its predicate/);
  });

  it('rejects extra keys unless allowed', () => {
    expect(() => expectMatchObjectByKeys({ id: 1, extra: 2 }, { id: isNumber })).toThrow(/unexpected keys/);
    expect(() =>
      expectMatchObjectByKeys({ id: 1, extra: 2 }, { id: isNumber }, { allowExtraKeys: true }),
    ).not.toThrow();
  });
});
