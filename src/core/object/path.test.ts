import { describe, expect, it } from 'bun:test';
import { path } from '.';

describe('path', () => {
  it('gets a key in the deepest object', () => {
    expect(path('a.b.c', { a: { b: { c: 1, d: 2 }, e: 3 } })).toEqual(1);
  });

  it('gets a key not in the deepest object', () => {
    expect(path('a.e', { a: { b: { c: 1, d: 2 }, e: 3 } })).toEqual(3);
  });

  it('returns undefined for missing key', () => {
    expect(path('a.b.c.d' as any, { a: { b: { c: 1 } } })).toBeUndefined();
  });

  it('returns undefined for deeper missing key', () => {
    expect(path('a.b.c.d.e.f', { a: { b: { c: 1 } } })).toBeUndefined();
  });

  it('returns undefined for missing key on non-object', () => {
    expect(path('a.b.c', 1 as any)).toBeUndefined();
  });

  it('gets a deep key with an array field', () => {
    expect(path('a.b.1.c', { a: { b: [{ c: 1 }, { c: 2 }] } })).toEqual(2);
  });

  it('gets a missing key with an array field', () => {
    expect(path('a.b.3.c', { a: { b: [{ c: 1 }, { c: 2 }] } })).toBeUndefined();
  });

  it('gets a missing key with a number and no array field', () => {
    expect(path('a.b.3.c', { a: { b: { c: 1 } } })).toBeUndefined();
  });

  it('gets a deep key by a numeric field', () => {
    expect(path('a.1.c' as any, { a: { 1: { c: 1 } } })).toEqual(1);
  });

  it('gets a deep key by a numeric field that does not exist', () => {
    expect(path('a.2.c', { a: { 1: { c: 1 } } })).toBeUndefined();
  });
});
