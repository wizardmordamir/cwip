import { describe, expect, it } from 'bun:test';
import { isEmptyDeep } from './isEmptyDeep';

describe('isEmptyDeep', () => {
  it('treats nullish values as empty', () => {
    expect(isEmptyDeep(null)).toBe(true);
    expect(isEmptyDeep(undefined)).toBe(true);
  });

  it('treats blank strings as empty and non-blank as not', () => {
    expect(isEmptyDeep('')).toBe(true);
    expect(isEmptyDeep('   ')).toBe(true);
    expect(isEmptyDeep('x')).toBe(false);
  });

  it('treats numbers and booleans as not empty', () => {
    expect(isEmptyDeep(0)).toBe(false);
    expect(isEmptyDeep(42)).toBe(false);
    expect(isEmptyDeep(false)).toBe(false);
    expect(isEmptyDeep(true)).toBe(false);
  });

  it('handles arrays recursively', () => {
    expect(isEmptyDeep([])).toBe(true);
    expect(isEmptyDeep([null, '', '  '])).toBe(true);
    expect(isEmptyDeep([[], [{}]])).toBe(true);
    expect(isEmptyDeep([1])).toBe(false);
    expect(isEmptyDeep([{ a: 1 }])).toBe(false);
  });

  it('handles plain objects recursively', () => {
    expect(isEmptyDeep({})).toBe(true);
    expect(isEmptyDeep({ a: null, b: '', c: { d: [] } })).toBe(true);
    expect(isEmptyDeep({ a: 1 })).toBe(false);
    expect(isEmptyDeep({ a: { b: 'x' } })).toBe(false);
  });

  it('reports populated Maps and Sets as not empty (regression)', () => {
    expect(isEmptyDeep(new Set())).toBe(true);
    expect(isEmptyDeep(new Map())).toBe(true);
    expect(isEmptyDeep(new Set([1, 2, 3]))).toBe(false);
    expect(isEmptyDeep(new Map([['a', 1]]))).toBe(false);
  });

  it('does not misclassify a plain object with a numeric "size" property', () => {
    expect(isEmptyDeep({ size: 0 })).toBe(false);
    expect(isEmptyDeep({ size: 5 })).toBe(false);
  });

  it('does not infinitely recurse on circular references', () => {
    const a: any = {};
    a.self = a;
    expect(isEmptyDeep(a)).toBe(true);

    const arr: any[] = [];
    arr.push(arr);
    expect(isEmptyDeep(arr)).toBe(true);
  });
});
