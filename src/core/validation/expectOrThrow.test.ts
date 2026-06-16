import { describe, expect, it } from 'bun:test';
import { expectOrThrow } from './expectOrThrow';

describe('expectOrThrow', () => {
  it('returns the value when the evaluator passes', () => {
    const positive = expectOrThrow((n: number) => n > 0, 'must be positive');
    expect(positive(5)).toBe(5);
  });

  it('throws with the provided string message when the evaluator fails', () => {
    const positive = expectOrThrow((n: number) => n > 0, 'must be positive');
    expect(() => positive(-1)).toThrow('must be positive');
  });

  it('supports a function message that receives the value', () => {
    const positive = expectOrThrow(
      (n: number) => n > 0,
      (n) => `got ${n}, expected > 0`,
    );
    expect(() => positive(-3)).toThrow('got -3, expected > 0');
  });

  it('falls back to a default message when none is given', () => {
    const truthy = expectOrThrow((v: unknown) => Boolean(v));
    expect(() => truthy(0)).toThrow('expect failed');
  });

  it('includes a string value inline and JSON-stringifies non-string values', () => {
    const never = expectOrThrow(() => false, 'nope');
    expect(() => never('raw' as any)).toThrow('value: raw');
    expect(() => never({ a: 1 } as any)).toThrow('"a": 1');
  });
});
