import { describe, expect, it } from 'bun:test';
import { assocPath } from '.';

describe('assocPath', () => {
  it('sets a value at a shallow path', () => {
    const obj = { a: 1, b: 2 };
    expect(assocPath('c', 3, obj)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('sets a value at a deep path', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(assocPath('a.b.d', 2, obj)).toEqual({ a: { b: { c: 1, d: 2 } } });
  });

  it('creates nested objects as needed', () => {
    const obj = { a: 1 };
    expect(assocPath('b.c.d', 2, obj)).toEqual({ a: 1, b: { c: { d: 2 } } });
  });

  it('does not mutate the original object', () => {
    const obj = { a: { b: 1 } };
    const result = assocPath('a.c', 2, obj);
    expect(obj).toEqual({ a: { b: 1 } });
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });
});
