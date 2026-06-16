import { describe, expect, it } from 'bun:test';
import { extractKey } from './extractKey';

describe('extractKey', () => {
  it('transforms the input with fn then reads a deep key from the result', () => {
    const fromPayload = extractKey('user.name', (v: any) => v.payload);
    expect(fromPayload({ payload: { user: { name: 'Ada' } } })).toBe('Ada');
  });

  it('reads a shallow key', () => {
    const getId = extractKey('id', (v: any) => v.record);
    expect(getId({ record: { id: 42 } })).toBe(42);
  });

  it('returns undefined when the deep key is missing', () => {
    const get = extractKey('a.b.c', (v: any) => v);
    expect(get({ a: { b: {} } })).toBeUndefined();
  });

  it('is reusable across inputs', () => {
    const get = extractKey('x', (v: any) => v);
    expect(get({ x: 1 })).toBe(1);
    expect(get({ x: 2 })).toBe(2);
  });
});
