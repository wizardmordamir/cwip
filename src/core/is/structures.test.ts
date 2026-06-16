import { describe, expect, it } from 'bun:test';
import { isObjectNotArray } from './structures';

describe('isObjectNotArray', () => {
  it('is true for plain objects', () => {
    expect(isObjectNotArray({})).toBe(true);
    expect(isObjectNotArray({ a: 1 })).toBe(true);
  });

  it('is false for arrays', () => {
    expect(isObjectNotArray([])).toBe(false);
    expect(isObjectNotArray([1, 2])).toBe(false);
  });

  it('is false for null and primitives', () => {
    expect(isObjectNotArray(null)).toBe(false);
    expect(isObjectNotArray(undefined)).toBe(false);
    expect(isObjectNotArray(42)).toBe(false);
    expect(isObjectNotArray('str')).toBe(false);
    expect(isObjectNotArray(true)).toBe(false);
  });
});
