import { getDeepKey } from '.';

describe('getDeepKey', () => {
  it('gets a key in the deepest object', () => {
    expect(getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c')).toEqual(1);
  });

  it('gets a key not in the deepest object', () => {
    expect(getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.e')).toEqual(3);
  });

  it('returns undefined for missing key', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a.b.c.d')).toBeUndefined();
  });

  it('returns undefined for deeper missing key', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a.b.c.d.e.f')).toBeUndefined();
  });

  it('returns undefined for missing key on non-object', () => {
    expect(getDeepKey(1, 'a.b.c')).toBeUndefined();
  });

  it('uses a specified separator in the deepest object', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a/b/c', '/')).toEqual(1);
  });

  it('gets a deep key with a specified separator not in the deepest object', () => {
    expect(getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/e', '/')).toEqual(3);
  });

  it('uses a specified separator with missing key', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a/b/c/d', '/')).toBeUndefined();
  });

  it('gets a deep key with an array field', () => {
    expect(getDeepKey({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a.b.1.c')).toEqual(2);
  });

  it('gets a missing key with an array field', () => {
    expect(getDeepKey({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a.b.3.c')).toBeUndefined();
  });

  it('gets a missing key with a number and no array field', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a.b.3.c')).toBeUndefined();
  });

  it('gets a missing key with a number and no array field with separator', () => {
    expect(getDeepKey({ a: { b: [{ c: 1 }, { c: 2 }] } }, 'a/b/3/c', '/')).toBeUndefined();
  });

  it('gets a missing key with a key number and no array field with separator', () => {
    expect(getDeepKey({ a: { b: { c: 1 } } }, 'a/b/3/c', '/')).toBeUndefined();
  });

  it('gets a deep key by a numeric field', () => {
    expect(getDeepKey({ a: { 1: { c: 1 } } }, 'a.1.c')).toEqual(1);
  });

  it('gets a deep key by a numeric field that does not exist', () => {
    expect(getDeepKey({ a: { 1: { c: 1 } } }, 'a.2.c')).toBeUndefined();
  });
});
