import { describe, expect, it } from 'bun:test';
import { existy, isNull, isNullish, isUndefined, truthy } from '.';

describe('isNull', () => {
  it('returns true for null only', () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
    expect(isNull(0)).toBe(false);
    expect(isNull('')).toBe(false);
    expect(isNull(false)).toBe(false);
  });
});

describe('isUndefined', () => {
  it('returns true for undefined only', () => {
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isUndefined(0)).toBe(false);
    expect(isUndefined('')).toBe(false);
  });
});

describe('isNullish', () => {
  it('returns true for null and undefined', () => {
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish(0)).toBe(false);
    expect(isNullish('')).toBe(false);
    expect(isNullish(false)).toBe(false);
  });
});

describe('existy', () => {
  it('returns false for null and undefined, true for everything else', () => {
    expect(existy(null)).toBe(false);
    expect(existy(undefined)).toBe(false);
    expect(existy(0)).toBe(true);
    expect(existy('')).toBe(true);
    expect(existy(false)).toBe(true);
    expect(existy([])).toBe(true);
    expect(existy({})).toBe(true);
  });
});

describe('truthy', () => {
  it('returns false for false, null, and undefined; true for everything else (0 and "" are truthy)', () => {
    expect(truthy(false)).toBe(false);
    expect(truthy(null)).toBe(false);
    expect(truthy(undefined)).toBe(false);
    // Unlike JS !!x, 0 and "" are truthy here (only false/null/undefined are falsy)
    expect(truthy(0)).toBe(true);
    expect(truthy('')).toBe(true);
    expect(truthy('x')).toBe(true);
    expect(truthy(1)).toBe(true);
    expect(truthy([])).toBe(true);
    expect(truthy({})).toBe(true);
  });
});
